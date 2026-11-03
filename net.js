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
  // ---------- ICE (v1.6.0 hotfix) ----------
  // PeerJS's own free TURN relay was shut down, so friends behind strict NAT / CGNAT / mobile data / school Wi-Fi
  // (or two players on the same Wi-Fi without hairpin NAT) could never connect. Use several STUN servers plus free
  // public TURN relays on 80/443/TLS, and if WebRTC still fails, fall back to a relayed transport (below).
  async function iceServers() {
    const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: ['turn:freeturn.net:3478', 'turn:freeturn.net:3478?transport=tcp', 'turns:freeturn.net:5349'], username: 'free', credential: 'free' }];
    try { // Open Relay (metered.ca) public static-auth TURN: time-limited credential = HMAC-SHA1(public secret, "expiry:user")
      const user = (Math.floor(Date.now() / 1000) + 86400) + ':nighthunt', enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(user)));
      ice.push({ urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443?transport=tcp', 'turns:staticauth.openrelay.metered.ca:443?transport=tcp'], username: user, credential: btoa(String.fromCharCode(...sig)) });
    } catch (e) { }
    return ice;
  }
  const peerOpts = async () => ({ config: { iceServers: await iceServers(), iceCandidatePoolSize: 2 } });
  // ---------- relay transport (fallback when WebRTC can't connect) ----------
  // Game messages ride on ephemeral (never stored) Nostr events over WSS on port 443, so it works anywhere a normal
  // website works. Batched at 10 Hz, deflate-compressed and chunked; a bit more lag than direct P2P.
  const GRELAYS = ['wss://nos.lol', 'wss://relay.primal.net'], GKIND = 21431, STATS = { tx: 0, rx: 0, rej: 0, last: '' };
  async function pack(obj) {
    let b = new TextEncoder().encode(JSON.stringify(obj));
    try { b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); } catch (e) { return ['j:' + JSON.stringify(obj)]; }
    let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
    s = btoa(s); const out = [], id = Math.random().toString(36).slice(2, 8), n = Math.ceil(s.length / 40000) || 1;
    for (let i = 0; i < n; i++) out.push(JSON.stringify({ id, i, n, d: s.slice(i * 40000, (i + 1) * 40000) }));
    return out;
  }
  function unpacker(cb) {
    const parts = new Map();
    return async str => {
      if (str.startsWith('j:')) { try { cb(JSON.parse(str.slice(2))); } catch (e) { } return; }
      let c; try { c = JSON.parse(str); } catch (e) { return; } if (!c || typeof c.d !== 'string' || !(c.n >= 1 && c.n <= 40)) return;
      let d = c.d; if (c.n > 1) { const p = parts.get(c.id) || { got: 0, a: [], t: Date.now() }; if (!p.a[c.i]) { p.a[c.i] = c.d; p.got++; } parts.set(c.id, p); if (p.got < c.n) { for (const [k, v] of parts) if (Date.now() - v.t > 20000) parts.delete(k); return; } parts.delete(c.id); d = p.a.join(''); }
      try { const bin = Uint8Array.from(atob(d), ch => ch.charCodeAt(0)); const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); cb(JSON.parse(txt)); } catch (e) { }
    };
  }
  function gchannel(subTag, onEvent) { // publish/subscribe on a couple of relays, de-duplicated by event id
    const key = NostrTools.generateSecretKey(), seen = new Set(), socks = []; let closed = false;
    for (const u of GRELAYS) (function open(u) {
      if (closed) return; const ws = new WebSocket(u); socks.push(ws);
      ws.onopen = () => ws.send(JSON.stringify(['REQ', 'g', { kinds: [GKIND], '#t': [subTag], since: Math.floor(Date.now() / 1000) - 5 }]));
      ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } if ((d[0] === 'OK' && !d[2]) || d[0] === 'NOTICE' || d[0] === 'CLOSED') { STATS.rej++; STATS.last = u + ' ' + String(d[3] || d[1] || d[2]).slice(0, 120); } if (d[0] !== 'EVENT' || !d[2] || seen.has(d[2].id)) return; seen.add(d[2].id); if (seen.size > 4000) seen.clear(); STATS.rx++; onEvent(d[2].content); };
      ws.onclose = () => { socks.splice(socks.indexOf(ws), 1); if (!closed) setTimeout(() => open(u), 2000); };
      ws.onerror = () => { };
    })(u);
    return {
      get ready() { return socks.some(w => w.readyState === 1); },
      pub(tag, content) { let ev; try { ev = NostrTools.finalizeEvent({ kind: GKIND, created_at: Math.floor(Date.now() / 1000), tags: [['t', tag]], content }, key); } catch (e) { return; } const m = JSON.stringify(['EVENT', ev]); STATS.tx++; for (const w of socks) if (w.readyState === 1) w.send(m); },
      close() { closed = true; for (const w of socks) try { w.close(); } catch (e) { } },
    };
  }
  const isSnap = s => s.startsWith('{"t":"s"');
  function relayHost(code, core, accept) { // host side: every friend that comes in over the relay becomes a virtual connection
    if (!window.NostrTools || !window.CompressionStream) return null;
    const vc = new Map(), H = 'nhg-' + code + '-h', C = 'nhg-' + code + '-c';
    const ch = gchannel(H, unpacker(env => {
      if (!env || typeof env.c !== 'string' || env.c.length > 24 || !Array.isArray(env.m)) return;
      let v = vc.get(env.c);
      if (!v) { if (vc.size >= 16) return; v = { q: [], last: 0 }; v.hc = core.handleConnection({ get readyState() { return vc.has(env.c) ? 1 : 3; }, send: s => v.q.push(s) }); vc.set(env.c, v); }
      v.last = Date.now();
      for (const d of env.m.slice(0, 40)) accept(v.hc, d);
    }));
    let busy = false, n = 0;
    const flush = async () => { // driven by the game's worker tick so it keeps running when the host's tab is in the background
      if (busy || ++n % 3) return; busy = true;
      const to = {}; let any = false;
      for (const [cid, v] of vc) {
        if (Date.now() - v.last > 30000) { vc.delete(cid); v.hc.close(); continue; }
        if (!v.q.length) continue; let snap = null; const q = [];
        for (const s of v.q) { if (isSnap(s)) snap = s; else q.push(s); } if (snap) q.push(snap); v.q = []; to[cid] = q; any = true;
      }
      try { if (any) for (const part of await pack({ to })) ch.pub(C, part); } finally { busy = false; }
    };
    return { flush, close() { ch.close(); for (const v of vc.values()) v.hc.close(); vc.clear(); } };
  }
  function relayJoin(code, onReply, onDead) { // friend side
    if (!window.NostrTools || !window.CompressionStream) return null;
    const cid = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8), H = 'nhg-' + code + '-h', C = 'nhg-' + code + '-c';
    let q = [], lastSend = 0, lastRx = 0, lastTick = Date.now();
    const ch = gchannel(C, unpacker(env => { const mine = env && env.to && env.to[cid]; if (Array.isArray(mine)) lastRx = Date.now(); if (Array.isArray(mine)) for (const s of mine) { try { onReply(JSON.parse(s)); } catch (e) { } } }));
    const iv = setInterval(async () => {
      const now = Date.now(); if (now - lastTick > 1500 && lastRx) lastRx = now; lastTick = now; // our own tab stalled (loading the map): not the host's fault
      if (lastRx && now - lastRx > 20000) { lastRx = 0; onDead && onDead(); }
      if (!ch.ready) return;
      if (!q.length && Date.now() - lastSend < 3000) return; // keep-alive every 3 s
      let inp = null; const m = []; for (const s of q) { if (s.startsWith('{"t":"input"')) inp = s; else m.push(s); } if (inp) m.push(inp); q = []; lastSend = Date.now();
      for (const part of await pack({ c: cid, m })) ch.pub(H, part);
    }, 100);
    return { send: o => q.push(JSON.stringify(o)), close() { clearInterval(iv); ch.close(); } };
  }

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
    ticker.onmessage = () => { try { core.step(); } catch (e) { console.error(e); } if (hub && hub.relay) hub.relay.flush(); };
    const local = { readyState: 1, send: s => onMsg(JSON.parse(s)) };
    const h = core.handleConnection(local);
    const conns = new Set();
    hub = { ticker, peer: null, conns, h, core, announce: null, relay: null };
    tx = { send: o => h.message(JSON.stringify(o)), close: () => hostStop() };
    // create the room first so we learn its code, then register the PeerJS id for it
    const origOnMsg = onMsg;
    h.message(JSON.stringify({ t: 'create', player: opts.player, name: opts.name, max: opts.max, isPublic: opts.isPublic, roundLen: opts.roundLen }));
    const room = [...core.rooms.values()][0];
    const accept = (hc, d) => { // remote messages: only join/play this room
      if (!hc || typeof d !== 'string' || d.length > 4096) return;
      let m; try { m = JSON.parse(d); } catch (e) { return; }
      if (!m || m.t === 'create' || m.t === 'list') return;
      if (m.t === 'join') m.code = room.code;
      hc.message(JSON.stringify(m));
    };
    hub.relay = relayHost(room.code, core, accept);
    peerOpts().then(o => { if (hub && hub.core === core) startPeer(o); });
    function startPeer(o) {
    const peer = new Peer(PEER_PREFIX + room.code.toLowerCase(), o);
    hub.peer = peer;
    peer.on('open', () => origOnMsg({ t: 'event', msg: 'Online server is live! Share the code or invite link.', kind: 'good' }));
    peer.on('error', e => { if (e.type === 'unavailable-id') origOnMsg({ t: 'event', msg: 'That server code is taken online, please leave and create again.', kind: 'bad' });
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') origOnMsg({ t: 'event', msg: 'Online connection problem: ' + e.type + ' (retrying)', kind: 'bad' }); });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    peer.on('connection', c => {
      let hc = null;
      const wrap = { get readyState() { return c.open ? 1 : 3; }, send: s => { try { c.send(s); } catch (e) { } } };
      c.on('open', () => { conns.add(c); hc = core.handleConnection(wrap); });
      c.on('data', d => accept(hc, d));
      const bye = () => { conns.delete(c); if (hc) hc.close(); hc = null; };
      c.on('close', bye); c.on('error', bye);
    });
    }
    // announce public servers
    hub.announce = setInterval(() => { if (room.isPublic && core.rooms.has(room.code)) nostrPublish({ ...core.roomInfo(room), at: Date.now() }); }, 4000);
  }
  function hostStop() {
    if (!hub) return;
    clearInterval(hub.announce); hub.ticker.terminate();
    for (const c of hub.conns) try { c.close(); } catch (e) { }
    try { hub.peer && hub.peer.destroy(); } catch (e) { }
    try { hub.relay && hub.relay.close(); } catch (e) { }
    for (const k of [...hub.core.rooms.keys()]) hub.core.rooms.delete(k);
    hub = null;
  }
  // ---------- online (P2P) join ----------
  function peerJoin(code, then) {
    let peer = null, c = null, done = false, rel = null, via = null, gotReply = false;
    const fail = msg => { if (done) return; done = true; clearTimeout(to); clearTimeout(rto); try { peer && peer.destroy(); } catch (e) { } try { rel && rel.close(); } catch (e) { } onDrop(msg); };
    const reply = m => { if (done) return; gotReply = true; clearTimeout(to); onMsg(m); };
    const startRelay = () => { // WebRTC didn't connect: go through the relay instead
      if (rel || via || done) return; rel = relayJoin(code, m => { if (!via) { via = 'relay'; try { peer && peer.destroy(); } catch (e) { } onMsg({ t: 'event', msg: 'Direct connection blocked by a network, so you are connected through a relay (a little more lag).', kind: 'good' }); } reply(m); }, () => fail('Lost the connection to the host (they may have closed the game).'));
      if (!rel) return; rel.send({ t: 'join', code, player: joinPlayer });
    };
    let joinPlayer = null;
    const to = setTimeout(() => fail('Could not reach that server. Check the code and make sure the host still has the game open.'), 40000);
    const rto = setTimeout(startRelay, 9000);
    peerOpts().then(o => {
      if (done) return; peer = new Peer(o);
      peer.on('open', () => {
        if (done || rel) return; c = peer.connect(PEER_PREFIX + code.toLowerCase(), { reliable: true, serialization: 'raw' });
        c.on('open', () => { if (rel || done) { try { c.close(); } catch (e) { } return; } via = 'p2p'; clearTimeout(rto); then(); });
        c.on('data', d => { if (via === 'p2p') { try { reply(JSON.parse(d)); } catch (e) { } } });
        c.on('close', () => { if (via === 'p2p') fail('The host closed the server or disconnected.'); });
      });
      peer.on('error', e => { if (e.type === 'peer-unavailable' || e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'browser-incompatible') startRelay(); });
    });
    tx = {
      send: o => { if (o && o.t === 'join') joinPlayer = o.player; if (via === 'p2p' && c && c.open) c.send(JSON.stringify(o)); else if (rel) rel.send(o); },
      close: () => { done = true; clearTimeout(to); clearTimeout(rto); try { peer && peer.destroy(); } catch (e) { } try { rel && rel.close(); } catch (e) { } },
    };
    tx.preJoin = p => { joinPlayer = p; };
  }
  // ---------- Nostr public server list ----------
  function relays() {
    if (relaySocks.length || !window.NostrTools) return;
    sk = NostrTools.generateSecretKey();
    for (const u of RELAYS) (function open(u) {
      const ws = new WebSocket(u); relaySocks.push(ws);
      ws.onopen = () => ws.send(JSON.stringify(['REQ', 'nh', { kinds: [KIND], '#t': [TOPIC], since: Math.floor(Date.now() / 1000) - 10 }]));
      ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } if ((d[0] === 'OK' && !d[2]) || d[0] === 'NOTICE' || d[0] === 'CLOSED') { STATS.rej++; STATS.last = u + ' ' + String(d[3] || d[1] || d[2]).slice(0, 120); } if (d[0] !== 'EVENT' || !d[2]) return; try { const s = JSON.parse(d[2].content); if (s && /^[A-Z0-9]{5}$/.test(s.code)) pubList.set(s.code, { ...s, seen: Date.now() }); } catch (x) { } };
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
    STATS, detect, setMode, get mode() { return mode; }, get serverAvail() { return serverAvail; }, relays, list,
    handlers(m, d) { onMsg = m; onDrop = d; },
    create(opts) { if (tx) tx.close(); if (mode === 'server') wsConnect(() => tx.send({ t: 'create', ...opts })); else hostCreate(opts); },
    join(code, player) { if (tx) tx.close(); if (mode === 'server') wsConnect(() => tx.send({ t: 'join', code, player })); else { peerJoin(code, () => tx.send({ t: 'join', code, player })); tx.preJoin(player); } },
    send(o) { if (tx) tx.send(o); },
    leave() { if (tx) { tx.send({ t: 'leave' }); tx.close(); tx = null; } },
  };
})();
