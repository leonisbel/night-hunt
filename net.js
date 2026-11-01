// Transport layer. Two modes:
//  server: a Night Hunt Node server (WebSocket /ws) – used by the desktop app on Wi-Fi/LAN or any hosted server.
//  online: serverless peer-to-peer. The host's browser runs the game core (core.js) and friends connect
//          over WebRTC (PeerJS public broker). Public servers are announced on Nostr public relays.
const NET = (() => {
  const PEER_PREFIX = 'nighthunt-v1-', TOPIC = 'nighthunt-public-v1', KIND = 20431;
  const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
  let mode = 'online', serverAvail = false, tx = null, onMsg = () => {}, onDrop = () => {};
  let hub = null; // host-side state in online mode
  const pubList = new Map(); let relaySocks = [], sk = null;

  async function detect() {
    try { const r = await fetch('api/info', { cache: 'no-store' }); if (r.ok) { serverAvail = true; const i = await r.json(); return i; } } catch (e) { }
    return null;
  }
  function setMode(m) { mode = m; }
  // ---------- server mode ----------
  function wsConnect(then) {
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    let opened = false;
    ws.onopen = () => { opened = true; then(); };
    ws.onmessage = e => onMsg(JSON.parse(e.data));
    ws.onclose = () => onDrop(opened ? 'Disconnected from server.' : 'Could not connect to the server.');
    tx = { send: o => ws.readyState === 1 && ws.send(JSON.stringify(o)), close: () => { ws.onclose = null; ws.close(); } };
  }
  // ---------- online (P2P) host ----------
  function hostCreate(opts) {
    const core = window.NightHuntCore;
    for (const k of [...core.rooms.keys()]) core.rooms.delete(k);
    const ticker = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),' + Math.round(core.TICK) + ')'], { type: 'text/javascript' })));
    ticker.onmessage = () => { try { core.step(); } catch (e) { console.error(e); } };
    const local = { readyState: 1, send: s => onMsg(JSON.parse(s)) };
    const h = core.handleConnection(local);
    const conns = new Set();
    hub = { ticker, peer: null, conns, h, core, announce: null };
    tx = { send: o => h.message(JSON.stringify(o)), close: () => hostStop() };
    // create the room first so we learn its code, then register the PeerJS id for it
    const origOnMsg = onMsg;
    h.message(JSON.stringify({ t: 'create', player: opts.player, name: opts.name, max: opts.max, isPublic: opts.isPublic }));
    const room = [...core.rooms.values()][0];
    const peer = new Peer(PEER_PREFIX + room.code.toLowerCase());
    hub.peer = peer;
    peer.on('open', () => origOnMsg({ t: 'event', msg: 'Online server is live! Share the code or invite link.', kind: 'good' }));
    peer.on('error', e => { if (e.type === 'unavailable-id') origOnMsg({ t: 'event', msg: 'That server code is taken online, please leave and create again.', kind: 'bad' });
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') origOnMsg({ t: 'event', msg: 'Online connection problem: ' + e.type + ' (retrying)', kind: 'bad' }); });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    peer.on('connection', c => {
      let hc = null;
      const wrap = { get readyState() { return c.open ? 1 : 3; }, send: s => { try { c.send(s); } catch (e) { } } };
      c.on('open', () => { conns.add(c); hc = core.handleConnection(wrap); });
      c.on('data', d => {
        if (!hc || typeof d !== 'string' || d.length > 4096) return;
        let m; try { m = JSON.parse(d); } catch (e) { return; }
        if (!m || m.t === 'create' || m.t === 'list') return;                       // remotes may only join/play this room
        if (m.t === 'join') m.code = room.code;
        hc.message(JSON.stringify(m));
      });
      const bye = () => { conns.delete(c); if (hc) hc.close(); hc = null; };
      c.on('close', bye); c.on('error', bye);
    });
    // announce public servers
    hub.announce = setInterval(() => { if (room.isPublic && core.rooms.has(room.code)) nostrPublish({ ...core.roomInfo(room), at: Date.now() }); }, 4000);
  }
  function hostStop() {
    if (!hub) return;
    clearInterval(hub.announce); hub.ticker.terminate();
    for (const c of hub.conns) try { c.close(); } catch (e) { }
    try { hub.peer.destroy(); } catch (e) { }
    for (const k of [...hub.core.rooms.keys()]) hub.core.rooms.delete(k);
    hub = null;
  }
  // ---------- online (P2P) join ----------
  function peerJoin(code, then) {
    const peer = new Peer(); let c = null, done = false;
    const fail = msg => { if (done) return; done = true; try { peer.destroy(); } catch (e) { } onDrop(msg); };
    const to = setTimeout(() => { if (!c || !c.open) fail('Could not reach that server. Check the code, or the host\'s network may block peer-to-peer.'); }, 15000);
    peer.on('open', () => {
      c = peer.connect(PEER_PREFIX + code.toLowerCase(), { reliable: true, serialization: 'raw' });
      c.on('open', () => { clearTimeout(to); then(); });
      c.on('data', d => { try { onMsg(JSON.parse(d)); } catch (e) { } });
      c.on('close', () => fail('The host closed the server or disconnected.'));
    });
    peer.on('error', e => { if (e.type === 'peer-unavailable') { clearTimeout(to); fail('No online server with that code.'); } });
    tx = { send: o => { if (c && c.open) c.send(JSON.stringify(o)); }, close: () => { done = true; clearTimeout(to); try { peer.destroy(); } catch (e) { } } };
  }
  // ---------- Nostr public server list ----------
  function relays() {
    if (relaySocks.length || !window.NostrTools) return;
    sk = NostrTools.generateSecretKey();
    for (const u of RELAYS) (function open(u) {
      const ws = new WebSocket(u); relaySocks.push(ws);
      ws.onopen = () => ws.send(JSON.stringify(['REQ', 'nh', { kinds: [KIND], '#t': [TOPIC], since: Math.floor(Date.now() / 1000) - 10 }]));
      ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } if (d[0] !== 'EVENT' || !d[2]) return; try { const s = JSON.parse(d[2].content); if (s && /^[A-Z0-9]{5}$/.test(s.code)) pubList.set(s.code, { ...s, seen: Date.now() }); } catch (x) { } };
      ws.onclose = () => { relaySocks = relaySocks.filter(x => x !== ws); setTimeout(() => open(u), 5000); };
      ws.onerror = () => { };
    })(u);
  }
  function nostrPublish(info) {
    relays(); if (!sk) return;
    let ev; try { ev = NostrTools.finalizeEvent({ kind: KIND, created_at: Math.floor(Date.now() / 1000), tags: [['t', TOPIC]], content: JSON.stringify(info) }, sk); } catch (e) { return; }
    for (const w of relaySocks) if (w.readyState === 1) w.send(JSON.stringify(['EVENT', ev]));
  }
  async function list() {
    if (mode === 'server') return (await (await fetch('api/servers')).json());
    relays();
    const t = Date.now(); return [...pubList.values()].filter(s => t - s.seen < 12000).map(s => ({ code: s.code, name: String(s.name).slice(0, 24), players: s.players | 0, max: s.max | 0, state: s.state }));
  }
  return {
    detect, setMode, get mode() { return mode; }, get serverAvail() { return serverAvail; }, relays, list,
    handlers(m, d) { onMsg = m; onDrop = d; },
    create(opts) { if (tx) tx.close(); if (mode === 'server') wsConnect(() => tx.send({ t: 'create', ...opts })); else hostCreate(opts); },
    join(code, player) { if (tx) tx.close(); if (mode === 'server') wsConnect(() => tx.send({ t: 'join', code, player })); else peerJoin(code, () => tx.send({ t: 'join', code, player })); },
    send(o) { if (tx) tx.send(o); },
    leave() { if (tx) { tx.send({ t: 'leave' }); tx.close(); tx = null; } },
  };
})();
