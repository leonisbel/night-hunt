// Lobby city and mall dressing. Instanced where it repeats. Low tier keeps the centerpiece and skips the dense scatter.
import * as THREE from '../vendor/three.module.min.js';
import { pbrMat } from './gfx.js';
import { newYearNumber } from './season.js';

const S = 1 / 20;
const BUDGET = {
  low:   { win: 0,   furn: 6,  snow: 0,   leaves: 24,  confetti: 16, fw: 3, bun: 2, duck: 2, lights: 6,  ornaments: 8 },
  med:   { win: 40,  furn: 12, snow: 60,  leaves: 60,  confetti: 36, fw: 5, bun: 3, duck: 3, lights: 16, ornaments: 20 },
  high:  { win: 100, furn: 22, snow: 140, leaves: 110, confetti: 64, fw: 7, bun: 5, duck: 4, lights: 28, ornaments: 36 },
  ultra: { win: 150, furn: 30, snow: 200, leaves: 160, confetti: 90, fw: 9, bun: 6, duck: 5, lights: 40, ornaments: 48 },
};

function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, emissive: o.e || '#000', emissiveIntensity: o.ei || 0 });
}
function glass() {
  return new THREE.MeshPhysicalMaterial({ color: '#d5e6f2', roughness: 0.06, metalness: 0.12, transparent: true, opacity: 0.38, envMapIntensity: 1.1, side: THREE.DoubleSide });
}
function signMat(text, sub, fg, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 200;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 200);
  x.strokeStyle = fg; x.lineWidth = 10; x.strokeRect(8, 8, 496, 184);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 58px sans-serif'; x.fillText(text, 256, sub ? 78 : 100);
  if (sub) { x.font = 'bold 28px sans-serif'; x.fillStyle = '#fff6e0'; x.fillText(sub, 256, 138); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
}
function board(parent, text, sub, fg, bg, x, y, z, w = 3.2) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.4), signMat(text, sub, fg, bg));
  m.position.set(x, y, z); parent.add(m); return m;
}
function inst(geo, mat, n, parent) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  mesh.count = 0; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function put(mesh, dummy, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0) {
  if (mesh.count >= mesh.instanceMatrix.count) return;
  dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
  mesh.setMatrixAt(mesh.count++, dummy.matrix);
}

function hits(b, x, y, pad = 0) {
  return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
}
function buildMallFacade(group, anim, map, mall, tier, focus) {
  const white = new THREE.MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.32, metalness: 0.02 });
  const glow = new THREE.MeshPhysicalMaterial({ color: '#d7e7f4', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.58, emissive: '#ffd0a0', emissiveIntensity: 0.72, envMapIntensity: 1.15, side: THREE.DoubleSide });
  const ents = (map.mall && map.mall.entrances) || [];
  const blocked = (x, y) => ents.some(e => x > e.x - 50 && x < e.x + e.w + 50 && y > e.y - 50 && y < e.y + e.h + 50);
  const max = tier === 'low' ? 36 : 120;
  const we = inst(new THREE.BoxGeometry(0.07, 1.2, 2.05), glow, max, group);
  const ns = inst(new THREE.BoxGeometry(2.05, 1.2, 0.07), glow, max, group);
  const dummy = new THREE.Object3D();
  const step = tier === 'low' ? 180 : 96;
  const pane = (mesh, x, y, hy) => { if (mesh.count >= max || blocked(x, y)) return; put(mesh, dummy, x * S, hy, y * S); };
  for (let y = mall.y + 80; y < mall.y + mall.h - 80; y += step) {
    pane(we, mall.x - 10, y, 1.65); pane(we, mall.x - 10, y, 5.7);
    pane(we, mall.x + mall.w + 10, y, 1.65); pane(we, mall.x + mall.w + 10, y, 5.7);
  }
  for (let x = mall.x + 80; x < mall.x + mall.w - 80; x += step) {
    pane(ns, x, mall.y - 10, 1.65); pane(ns, x, mall.y - 10, 5.7);
    pane(ns, x, mall.y + mall.h + 10, 1.65); pane(ns, x, mall.y + mall.h + 10, 5.7);
  }
  we.instanceMatrix.needsUpdate = true; ns.instanceMatrix.needsUpdate = true;
  const doors = [];
  for (const e of ents) {
    const alongZ = e.face === 'w' || e.face === 'e';
    const span = (alongZ ? e.h : e.w) * S;
    const paneW = span * 0.46;
    const geo = new THREE.BoxGeometry(alongZ ? 0.06 : paneW, 3.05, alongZ ? paneW : 0.06);
    const a = new THREE.Mesh(geo, glow), b = new THREE.Mesh(geo, glow);
    const out = e.face === 'w' ? -0.35 : e.face === 'e' ? 0.35 : 0;
    const outZ = e.face === 'n' ? -0.35 : e.face === 's' ? 0.35 : 0;
    const cx = (e.x + e.w / 2) * S + out, cz = (e.y + e.h / 2) * S + outZ;
    a.position.set(cx, 1.55, cz); b.position.set(cx, 1.55, cz); group.add(a, b);
    const jamb = (dx, dz) => { const j = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.25, 0.18), white); j.position.set(cx + dx, 1.62, cz + dz); group.add(j); };
    if (alongZ) { jamb(0, -span / 2); jamb(0, span / 2); } else { jamb(-span / 2, 0); jamb(span / 2, 0); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.22 : span + 0.2, 0.16, alongZ ? span + 0.2 : 0.22), white);
    head.position.set(cx, 3.22, cz); group.add(head);
    if (e.canopy) {
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, span + 1.6), white);
      canopy.position.set(cx + (e.face === 'w' ? -2.2 : 2.2), 3.55, cz); group.add(canopy);
      for (const side of [-1, 1]) { const col = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.45, 0.26), white); col.position.set(cx - 3.8, 1.7, cz + side * (span * 0.5 + 0.2)); group.add(col); }
    }
    const sign = board(group, e.canopy ? 'NIGHT MALL' : e.name, e.canopy ? 'MAIN ENTRANCE' : 'SIDE ENTRANCE', '#1c1e24', '#f7f7f5', cx + (e.face === 'w' ? -2.2 : e.face === 'e' ? 2.2 : 0), e.canopy ? 4.45 : 3.7, cz + (e.face === 'n' ? -0.4 : e.face === 's' ? 0.4 : 0), e.canopy ? 7 : 3.2);
    sign.rotation.y = e.face === 'w' ? -Math.PI / 2 : e.face === 'e' ? Math.PI / 2 : e.face === 'n' ? Math.PI : 0;
    doors.push({ a, b, alongZ, cx, cz, shut: paneW * 0.5, open: paneW * 0.98, ex: e.x + e.w / 2, ey: e.y + e.h / 2, reach: Math.max(e.w, e.h) + 180 });
  }
  anim.push(() => {
    for (const d of doors) {
      const near = focus.on && Math.hypot(focus.x - d.ex, focus.y - d.ey) < d.reach;
      const target = near ? d.open : d.shut;
      if (d.alongZ) { d.a.position.z += (d.cz - target - d.a.position.z) * 0.16; d.b.position.z += (d.cz + target - d.b.position.z) * 0.16; }
      else { d.a.position.x += (d.cx - target - d.a.position.x) * 0.16; d.b.position.x += (d.cx + target - d.b.position.x) * 0.16; }
    }
  });
}
function buildMallInterior(group, anim, map, mall, tier, cx, cz, focus) {
  const info = map.mall, atr = info && info.atrium;
  const ax = atr ? (atr.x + atr.w / 2) * S : cx, az = atr ? (atr.y + atr.h / 2) * S : cz;
  const aw = atr ? atr.w * S : 16, ad = atr ? atr.h * S : 16;
  const gmat = glass();
  const tile = tier === 'low' ? 160 : 100;
  let n = 0;
  for (let x = mall.x + 40; x < mall.x + mall.w - 40; x += tile) for (let y = mall.y + 40; y < mall.y + mall.h - 40; y += tile) n++;
  const ground = inst(new THREE.BoxGeometry(tile * S * 0.96, 0.08, tile * S * 0.96), pbrMat('planks', 2, 2, { color: '#cfc6b8', r: 0.8 }), n, group);
  const deck = inst(new THREE.BoxGeometry(tile * S * 0.96, 0.16, tile * S * 0.96), pbrMat('planks', 2, 2, { color: '#e4dccb', r: 0.72 }), n, group);
  const dummy = new THREE.Object3D();
  const ramps = (map.lifts || []).filter(r => r.axis);
  for (let x = mall.x + 40; x < mall.x + mall.w - 40; x += tile) for (let y = mall.y + 40; y < mall.y + mall.h - 40; y += tile) {
    const cxr = x + tile / 2, cyr = y + tile / 2;
    put(ground, dummy, cxr * S, 0.04, cyr * S);
    if (atr && hits(atr, cxr, cyr, 20)) continue;
    if (ramps.some(r => hits(r, cxr, cyr, 10))) continue;
    put(deck, dummy, cxr * S, 4.12, cyr * S);
  }
  ground.instanceMatrix.needsUpdate = true; deck.instanceMatrix.needsUpdate = true;
  for (const [rx, rz, rw, rd] of [[ax, az - ad / 2, aw, 0.08], [ax, az + ad / 2, aw, 0.08], [ax - aw / 2, az, 0.08, ad], [ax + aw / 2, az, 0.08, ad]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.2, rw), 1.05, Math.max(0.2, rd)), gmat);
    rail.position.set(rx, 4.85, rz); group.add(rail);
  }
  const sky = new THREE.Mesh(new THREE.BoxGeometry((mall.w * S) * 0.9, 0.06, (mall.h * S) * 0.9), new THREE.MeshPhysicalMaterial({ color: '#d5e9ff', roughness: 0.05, metalness: 0.04, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  sky.position.set((mall.x + mall.w / 2) * S, 8.4, (mall.y + mall.h / 2) * S); group.add(sky);
  const lampMat = std('#fff4d2', { e: '#ffe1a8', ei: 1.4, r: 0.3 });
  const lamps = inst(new THREE.BoxGeometry(1.6, 0.08, 0.28), lampMat, tier === 'low' ? 6 : 14, group);
  let li = 0;
  for (let x = mall.x + 280; x < mall.x + mall.w - 200 && li < (tier === 'low' ? 6 : 14); x += tier === 'low' ? 700 : 420) {
    put(lamps, dummy, x * S, 7.6, (mall.y + mall.h * 0.42) * S); li++;
  }
  lamps.instanceMatrix.needsUpdate = true;
  board(group, 'NIGHT MALL', 'STAIRS  ·  ESCALATORS  ·  SHOPS', '#ffd27a', '#24180e', (mall.x + 180) * S, 5.6, (mall.y + 80) * S, 6);
  const names = { weapons: 'WEAPON SHOP', armor: 'ARMOR', food: 'FOOD COURT', pets: 'PETS', skinshop: 'CLOTHING', monskins: 'MONSTER SHOP', emotes: 'ARCADE', clothing: 'DRESSING ROOM', crate: 'CRATES' };
  for (const z of map.zones || []) {
    if (!names[z.k]) continue;
    const y = 1.5 + (z.fl || 0) * 4.2;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(Math.max(2.4, z.w * S * 0.55), 2.2, 0.05), gmat);
    pane.position.set((z.x + z.w / 2) * S, y, (z.y + z.h * 0.15) * S); group.add(pane);
    board(group, names[z.k], z.fl ? 'UPPER LEVEL' : 'GROUND FLOOR', z.c || '#fff', '#1c140c', (z.x + z.w / 2) * S, y + 1.45, (z.y + z.h * 0.15) * S, 2.6);
  }
  const railMat = std('#d9dde2', { m: 0.65, r: 0.28 });
  const stepMat = std('#b7bcc2', { m: 0.4, r: 0.35 });
  for (const r of map.lifts || []) {
    const mx = (r.x + r.w / 2) * S, mz0 = r.y * S, mz1 = (r.y + r.h) * S;
    if (r.kind === 'elevator') {
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(r.w * S, 4.3, r.h * S), new THREE.MeshPhysicalMaterial({ color: '#d5e2ee', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
      shaft.position.set(mx, 2.15, (mz0 + mz1) / 2); group.add(shaft);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(r.w * S * 0.78, 0.12, r.h * S * 0.78), std('#9aa3ad', { m: 0.5, r: 0.35 }));
      cab.position.set(mx, 0.15, (mz0 + mz1) / 2); group.add(cab);
      board(group, 'ELEVATOR', 'PRESS E', '#d7e6ff', '#141820', mx, 3.3, (mz0 + mz1) / 2, 1.8);
      anim.push(t => { cab.position.y = 0.2 + (0.5 + 0.5 * Math.sin(t * 0.35)) * 4.0; });
      continue;
    }
    const run = Math.abs(mz1 - mz0), rise = 4.2, len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    const slope = new THREE.Mesh(new THREE.BoxGeometry(r.w * S * 0.9, 0.16, len), r.kind === 'stair' ? stepMat : std('#8d949c', { m: 0.55, r: 0.32 }));
    slope.position.set(mx, 2.1, (mz0 + mz1) / 2);
    slope.rotation.x = ang;
    group.add(slope);
    for (const side of [-1, 1]) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), railMat);
      hand.position.set(mx + side * r.w * S * 0.42, 2.55, (mz0 + mz1) / 2);
      hand.rotation.x = ang; group.add(hand);
    }
    const landMat = pbrMat('concrete', 1, 1, { color: '#d5d0c8', r: 0.7 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(r.w * S * 0.9, 0.12, Math.max(0.8, run * 0.12)), landMat);
    top.position.set(mx, 4.14, mz0 + run * 0.06); group.add(top);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(r.w * S * 0.9, 0.1, Math.max(0.8, run * 0.12)), landMat);
    bot.position.set(mx, 0.08, mz1 - run * 0.06); group.add(bot);
    const label = r.kind === 'stair' ? 'STAIRS' : (r.belt > 0 ? 'ESCALATOR UP' : 'ESCALATOR DOWN');
    board(group, label, r.kind === 'stair' ? 'WALK' : 'STAND ON', '#ffe7a8', '#24180e', mx, 3.2, (mz0 + mz1) / 2, 2.2);
    if (r.kind === 'escalator') {
      const nStep = tier === 'low' ? 5 : 9;
      const steps = [];
      for (let i = 0; i < nStep; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(r.w * S * 0.72, 0.06, 0.28), std('#f2f4f6', { m: 0.25, r: 0.4 })); group.add(s); steps.push(s); }
      const dir = r.belt > 0 ? 1 : -1;
      anim.push(t => steps.forEach((s, i) => {
        let u = ((i / nStep) + t * 0.18 * dir) % 1; if (u < 0) u += 1;
        s.position.set(mx, 0.18 + u * 4.05, mz1 - u * run);
      }));
    }
  }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.45, tier === 'low' ? 10 : 20), pbrMat('castle', 1, 1, { color: '#d9d4cc' }));
  ring.position.set(ax, 0.28, az); group.add(ring);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.15, 18), new THREE.MeshPhysicalMaterial({ color: '#7eb8d4', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.75 }));
  water.rotation.x = -Math.PI / 2; water.position.set(ax, 0.42, az); group.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.4, 8), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.65 }));
  jet.position.set(ax, 1.1, az); group.add(jet);
  anim.push(t => { jet.scale.y = 0.85 + Math.sin(t * 3) * 0.12; jet.position.y = 1.05 + Math.sin(t * 3) * 0.05; });
  buildMallFacade(group, anim, map, mall, tier, focus);
}

export function dressLobby(map, season, tier, when = new Date()) {
  const group = new THREE.Group(); group.name = 'lobbydress';
  const anim = [];
  const night = season === 'july4' || season === 'newyear';
  const focus = { x: 0, y: 0, on: false };
  const done = () => ({ group, night, tick(t, dt, md) { focus.on = !!(md && md.dx != null); if (focus.on) { focus.x = md.dx; focus.y = md.dy; } for (const fn of anim) fn(t, dt); } });
  if (!map || typeof document === 'undefined') return done();
  const B = BUDGET[tier] || BUDGET.high;
  const dummy = new THREE.Object3D();
  const mall = (map.bld || []).find(b => b.kind === 'mall');
  const cx = mall ? (mall.x + mall.w * 0.5) * S : 166;
  const cz = mall ? (mall.y + mall.h * 0.5) * S : 70.5;
  const concrete = pbrMat('concrete', 6, 2, { color: '#d5d2cb', r: 0.92 });
  const curbMat = pbrMat('concrete', 2, 1, { color: '#b7b4ae', r: 0.85 });
  const sand = pbrMat('sand', 4, 2, { color: '#e6d2a4', r: 1 });
  const leafMat = pbrMat('leaves', 3, 3, { color: '#c4682a', r: 1 });

  // Sidewalks and curbs along the avenue. The driving lane itself stays clear.
  const walkN = new THREE.Mesh(new THREE.PlaneGeometry(108, 3.2), concrete);
  walkN.rotation.x = -Math.PI / 2; walkN.position.set(58, 0.03, 62.2); group.add(walkN);
  const walkS = walkN.clone(); walkS.position.set(58, 0.03, 85.6); group.add(walkS);
  for (const z of [63.9, 83.9]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(108, 0.16, 0.28), curbMat);
    curb.position.set(58, 0.08, z); group.add(curb);
  }
  const stripe = inst(new THREE.PlaneGeometry(0.35, 3.4), new THREE.MeshBasicMaterial({ color: '#f4f1e4' }), 36, group);
  for (const x of [22, 58, 96]) for (let i = 0; i < 8; i++) put(stripe, dummy, x, 0.045, 66.2 + i * 2.15, 1, 1, 1, 0, -Math.PI / 2);
  stripe.instanceMatrix.needsUpdate = true;
  for (const z of [65.2, 82.6]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(100, 0.12), new THREE.MeshBasicMaterial({ color: '#f2efe4' }));
    edge.rotation.x = -Math.PI / 2; edge.position.set(58, 0.04, z); group.add(edge);
  }

  // Avenue-facing windows on the city blocks. One instanced grid, not a mesh per pane.
  if (B.win) {
    const win = inst(new THREE.BoxGeometry(0.9, 1.15, 0.08), std('#141820', { e: '#ffd7a4', ei: 0.7, r: 0.18, m: 0.2 }), B.win, group);
    const avenue = 1480;
    for (const w of map.walls || []) {
      if (!w.city || w.w < w.h) continue;
      const wy = w.y + w.h / 2;
      if (Math.abs(wy - avenue) > 420) continue;
      if (wy < avenue && w.y < 400) continue;
      if (wy > avenue && w.y > 2300) continue;
      const nz = wy < avenue ? 1 : -1;
      const len = w.w * S, hgt = Math.min(w.city, tier === 'med' ? 11 : w.city);
      const cols = Math.max(2, Math.min(8, Math.floor(len / 2.4)));
      const rows = Math.max(1, Math.min(tier === 'ultra' ? 5 : 3, Math.floor(hgt / 3.1)));
      const x0 = w.x * S;
      for (let r = 0; r < rows && win.count < B.win; r++) for (let c = 0; c < cols && win.count < B.win; c++) {
        put(win, dummy, x0 + (c + 0.5) * len / cols, 2.2 + r * 2.8, (w.y + w.h / 2) * S + nz * 0.55, 1, 1, 1, 0);
      }
    }
    win.instanceMatrix.needsUpdate = true;
  }

  const names = ['NORTH LOFTS', 'PAD VIEW', 'AVENUE HOUSE', 'LAMP COURT', 'ROW FIVE', 'SOUTH FLATS', 'HARBOR WALK', 'QUIET ROW', 'BRICK COURT', 'WEST END'];
  let ni = 0;
  for (const w of map.walls || []) {
    if (!w.city || w.w < 8 || ni >= (tier === 'low' ? 4 : names.length)) continue;
    const wy = w.y + w.h / 2;
    if (Math.abs(wy - 1480) > 420) continue;
    if (wy < 1480 && w.y < 400) continue;
    if (wy > 1480 && w.y > 2300) continue;
    const nz = wy < 1480 ? 1 : -1;
    const b = board(group, names[ni++] || 'CITY ROW', 'NIGHT AVENUE', '#ffe7b0', '#243044', (w.x + w.w / 2) * S, Math.min(w.city, 12) + 0.6, wy * S + nz * 0.8, 4.2);
    b.lookAt((w.x + w.w / 2) * S, b.position.y, wy * S + nz * 4);
  }

  // Benches, cans, planters, a few extra parked shells on the sidewalk (not the drivable cars).
  const bench = inst(new THREE.BoxGeometry(1.3, 0.42, 0.45), std('#6a4a32', { r: 0.8 }), B.furn, group);
  const can = inst(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), std('#2c3438', { m: 0.4, r: 0.45 }), B.furn, group);
  const pot = inst(new THREE.ConeGeometry(0.55, 1.1, 7), std('#2f6a34', { r: 0.85 }), B.furn, group);
  const shell = inst(new THREE.BoxGeometry(1.7, 0.55, 0.8), std('#3e4a62', { m: 0.45, r: 0.4 }), 4, group);
  let fi = 0;
  for (let x = 14; x < 104 && fi < B.furn; x += 7.5) {
    const north = fi % 2 === 0;
    const z = north ? 62.1 : 85.7;
    if (fi % 3 === 0) put(bench, dummy, x, 0.28, z);
    else if (fi % 3 === 1) put(can, dummy, x, 0.4, z);
    else put(pot, dummy, x, 0.7, z);
    fi++;
  }
  for (const [x, z] of [[16, 61.2], [46, 86.2], [72, 61.2], [100, 86.2]]) put(shell, dummy, x, 0.4, z, 1, 1, 1, z > 70 ? Math.PI : 0);
  bench.instanceMatrix.needsUpdate = can.instanceMatrix.needsUpdate = pot.instanceMatrix.needsUpdate = shell.instanceMatrix.needsUpdate = true;

  const poles = tier === 'low' ? 4 : 10;
  const poleMat = std('#2a2e32', { m: 0.6, r: 0.4 });
  const bulbMat = std('#fff1cc', { e: '#ffd9a0', ei: night ? 0.4 : 1.6, r: 0.3 });
  for (let i = 0; i < poles; i++) {
    const x = 12 + i * 10, z = i % 2 ? 86.4 : 61.4;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), poleMat);
    p.position.set(x, 2.1, z); group.add(p);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bulbMat);
    bulb.position.set(x + (z < 70 ? 0.7 : -0.7), 4.15, z); group.add(bulb);
  }
  const redM = std('#3a1010', { e: '#ff3030', ei: 0.2 });
  const yelM = std('#3a3010', { e: '#ffd040', ei: 0.15 });
  const grnM = std('#103018', { e: '#30ff70', ei: 1.6 });
  for (const x of [28, 90]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), poleMat);
    pole.position.set(x, 1.7, 64.6); group.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.22), std('#1a1c1e', { m: 0.4 }));
    box.position.set(x, 3.3, 64.6); group.add(box);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), redM); r.position.set(x, 3.5, 64.75); group.add(r);
    const y = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), yelM); y.position.set(x, 3.3, 64.75); group.add(y);
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), grnM); g.position.set(x, 3.1, 64.75); group.add(g);
  }
  anim.push(t => {
    const phase = Math.floor(t) % 10;
    redM.emissiveIntensity = phase < 5 ? 1.8 : 0.12;
    yelM.emissiveIntensity = phase === 5 || phase === 6 ? 1.8 : 0.1;
    grnM.emissiveIntensity = phase > 6 ? 1.8 : 0.12;
  });

  if (mall) buildMallInterior(group, anim, map, mall, tier, cx, cz, focus);

  const hub = new THREE.Group(); hub.position.set(cx, 0, cz); group.add(hub);
  buildSeason(hub, group, season, tier, B, when, anim, cx, cz, leafMat, sand);
  return done();
}

function buildSeason(hub, group, season, tier, B, when, anim, cx, cz, leafMat, sand) {
  const dummy = new THREE.Object3D();
  if (season === 'christmas') christmas(hub, group, B, anim, tier);
  else if (season === 'thanksgiving') thanksgiving(hub, group, B, anim, tier, leafMat);
  else if (season === 'newyear') newyear(hub, group, B, anim, tier, when);
  else if (season === 'stpatricks') patrick(hub, group, B, anim);
  else if (season === 'easter') easter(hub, group, B, anim, tier);
  else if (season === 'summer') summer(group, B, anim, tier, sand);
  else if (season === 'july4') july4(hub, group, B, anim, tier);
  else if (season === 'fall') fall(hub, group, B, anim, tier, leafMat);
  if (season === 'fall' || season === 'thanksgiving') drift(group, anim, B.leaves, { x: 8, z: 55, w: 100, d: 40, h: 8 }, '#c45a22', 0.22, 0.35);
  if (season === 'christmas') drift(group, anim, B.snow, { x: 0, z: 50, w: 120, d: 50, h: 16 }, '#f4f7fb', 0.12, 0.55);
  if (season === 'newyear') drift(group, anim, B.confetti, { x: cx - 12, z: cz - 12, w: 24, d: 24, h: 8 }, '#ffd23a', 0.1, 0.4);
}

function drift(group, anim, n, box, color, size, speed) {
  if (!n) return;
  const pos = new Float32Array(n * 3), spd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = box.x + Math.random() * box.w; pos[i * 3 + 1] = Math.random() * box.h; pos[i * 3 + 2] = box.z + Math.random() * box.d; spd[i] = speed * (0.45 + Math.random()); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, depthWrite: false }));
  group.add(pts);
  anim.push((t, dt) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 1] -= spd[i] * dt;
      pos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.25;
      if (pos[i * 3 + 1] < 0.15) pos[i * 3 + 1] = box.h;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

function christmas(hub, group, B, anim, tier) {
  const green = std('#1c6b34', { r: 0.75 });
  const wood = std('#6b4428', { r: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.1, 8), wood); trunk.position.y = 0.55; hub.add(trunk);
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.3 - i * 0.42, 1.7, tier === 'low' ? 7 : 12), green);
    cone.position.y = 1.3 + i * 1.25; hub.add(cone);
  }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), std('#ffe38a', { e: '#ffe38a', ei: 1.8 }));
  star.position.y = 6.5; hub.add(star);
  const baubles = inst(new THREE.SphereGeometry(0.12, 8, 6), std('#c0392b', { e: '#ffd0a0', ei: 0.35, r: 0.3, m: 0.3 }), B.ornaments, hub);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < B.ornaments; i++) {
    const h = 1.2 + (i / B.ornaments) * 4.6;
    const rad = 1.9 - (h - 1.2) * 0.28;
    const a = i * 2.4;
    put(baubles, dummy, Math.cos(a) * rad, h, Math.sin(a) * rad);
  }
  baubles.instanceMatrix.needsUpdate = true;
  const cols = ['#b43333', '#1f6b45', '#d4a017', '#244e86'];
  for (let i = 0; i < (tier === 'low' ? 3 : 6); i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.5), std(cols[i % 4], { r: 0.6 }));
    const a = i / 6 * Math.PI * 2; box.position.set(Math.cos(a) * 1.6, 0.22, Math.sin(a) * 1.6); box.rotation.y = a; hub.add(box);
  }
  const bulbs = inst(new THREE.SphereGeometry(0.08, 6, 5), std('#fff6d0', { e: '#ffe29a', ei: 1.5 }), B.lights, group);
  for (let i = 0; i < B.lights; i++) {
    const a = i / B.lights * Math.PI * 8;
    put(bulbs, dummy, Math.cos(a) * (2.2 - i * 0.03), 1.4 + (i / B.lights) * 4.4, Math.sin(a) * (2.2 - i * 0.03));
  }
  bulbs.instanceMatrix.needsUpdate = true;
  const glow = bulbs.material;
  anim.push(t => { glow.emissiveIntensity = 1.1 + Math.sin(t * 5) * 0.6; star.rotation.y = t * 0.4; });
  for (const [x, z] of [[-8, 6], [8, 6], [-8, -6], [8, -6]]) {
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), std('#f4f4f4', { r: 0.4 }));
    cane.position.set(x, 0.8, z); hub.add(cane);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.07, 6, 8, Math.PI), std('#d23a3a', { r: 0.4 }));
    hook.position.set(x, 1.65, z); hub.add(hook);
  }
  boardLocal(hub, 'HAPPY HOLIDAYS', 'NIGHT MALL', '#f4fff4', '#1a3a28', 0, 4.4, -4.4, 4.6);
}

function thanksgiving(hub, group, B, anim, tier, leafMat) {
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), std('#8a4a28', { r: 0.7 }));
  body.scale.set(1, 0.85, 1.25); body.position.y = 0.9; hub.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), std('#c47a3a', { r: 0.65 }));
  head.position.set(0, 1.35, 0.7); hub.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), std('#e0a030'));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.32, 0.98); hub.add(beak);
  const tail = new THREE.Mesh(new THREE.CircleGeometry(1.1, 10), std('#6a3018', { r: 0.8 }));
  tail.position.set(0, 1.15, -0.7); hub.add(tail);
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.2), std('#7a5230', { r: 0.75 }));
  table.position.set(2.6, 0.4, 0.4); hub.add(table);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), std(i % 2 ? '#e07a20' : '#d45520', { r: 0.8 }));
    p.position.set(1.6 + i * 0.5, 0.9, 0.4); hub.add(p);
  }
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), std('#c48a3a', { r: 0.7 }));
  horn.rotation.z = Math.PI / 2; horn.position.set(-2.2, 0.45, 0.2); hub.add(horn);
  boardLocal(hub, 'HARVEST TABLE', 'GIVE THANKS', '#fff0d0', '#6a3418', 0, 2.6, -2.2);
  scatterPumpkins(group, tier === 'low' ? 4 : 8);
  const bale = inst(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 8), std('#d2a24a', { r: 0.95 }), 4, group);
  const dummy = new THREE.Object3D();
  [[20, 0.45, 62], [40, 0.45, 86], [78, 0.45, 62], [96, 0.45, 86]].forEach(([x, y, z], i) => put(bale, dummy, x, y, z, 1, 1, 1, i));
  bale.instanceMatrix.needsUpdate = true;
  const patch = new THREE.Mesh(new THREE.CircleGeometry(6, 14), leafMat);
  patch.rotation.x = -Math.PI / 2; patch.position.set(0, 0.05, 2.2); hub.add(patch);
  anim.push(t => { tail.rotation.y = Math.sin(t * 0.8) * 0.08; });
}

function newyear(hub, group, B, anim, tier, when) {
  const year = newYearNumber(when);
  boardLocal(hub, 'HAPPY NEW YEAR', String(year), '#fff6c8', '#1a2040', 0, 3.2, 0, 7);
  const colors = ['#ff5a7a', '#7ad0ff', '#ffe14a', '#c49bff'];
  for (let i = 0; i < (tier === 'low' ? 4 : 8); i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), std(colors[i % 4], { r: 0.35 }));
    const a = i / 8 * Math.PI * 2; b.position.set(Math.cos(a) * 2.2, 1.6 + (i % 3) * 0.4, Math.sin(a) * 2.2); hub.add(b);
  }
  fireworks(group, anim, B.fw, tier);
}

function patrick(hub, group, B, anim) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.7, 10), std('#1a1a1a', { m: 0.5, r: 0.4 }));
  pot.position.y = 0.4; hub.add(pot);
  const gold = inst(new THREE.SphereGeometry(0.12, 6, 5), std('#ffd24a', { m: 0.8, r: 0.25, e: '#ffcc44', ei: 0.3 }), 10, hub);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 10; i++) put(gold, dummy, (Math.random() - 0.5) * 0.6, 0.85, (Math.random() - 0.5) * 0.6);
  gold.instanceMatrix.needsUpdate = true;
  const rainbow = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 8, 20, Math.PI), std('#7dff6a', { e: '#d8ff70', ei: 0.4 }));
  rainbow.rotation.z = Math.PI; rainbow.position.y = 2.5; hub.add(rainbow);
  boardLocal(hub, 'HAPPY ST. PATRICKS', 'NIGHT MALL', '#e8ffe8', '#145c32', 0, 3.6, -2.4);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.35, 3), std('#2f9a45', { e: '#39c85a', ei: 0.2 }));
    const a = i / 6 * Math.PI * 2; leaf.position.set(Math.cos(a) * 3, 1.2, Math.sin(a) * 3); hub.add(leaf);
  }
  anim.push(t => { rainbow.rotation.y = Math.sin(t * 0.4) * 0.15; });
}

function easter(hub, group, B, anim, tier) {
  const bunny = new THREE.Group();
  const fur = std('#f4efe6', { r: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), fur); body.position.y = 0.7; bunny.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), fur); head.position.set(0, 1.25, 0.15); bunny.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 6), std('#f7c9d4', { r: 0.7 }));
    ear.position.set(s * 0.12, 1.75, 0.05); bunny.add(ear);
  }
  hub.add(bunny);
  const eggs = inst(new THREE.SphereGeometry(0.16, 8, 6), std('#f7d36a', { r: 0.45 }), tier === 'low' ? 6 : 12, hub);
  const dummy = new THREE.Object3D();
  const cols = [0xf7d36a, 0xf29bb5, 0x9fd0f2, 0xb6e3a8];
  for (let i = 0; i < eggs.instanceMatrix.count && i < (tier === 'low' ? 6 : 12); i++) {
    const a = i / 12 * Math.PI * 2; put(eggs, dummy, Math.cos(a) * 1.5, 0.16, Math.sin(a) * 1.5, 0.8, 1.15, 0.8);
    eggs.setColorAt(i, new THREE.Color(cols[i % 4]));
  }
  eggs.instanceMatrix.needsUpdate = true; if (eggs.instanceColor) eggs.instanceColor.needsUpdate = true;
  boardLocal(hub, 'EGG HUNT', 'NIGHT MALL', '#fff6ea', '#d98b9a', 0, 2.4, -2);
  const hoppers = [];
  for (let i = 0; i < B.bun; i++) {
    const g = bunny.clone(); g.scale.setScalar(0.45); group.add(g);
    hoppers.push({ g, a: Math.random() * 6, r: 3 + i });
  }
  anim.push(t => {
    bunny.rotation.y = Math.sin(t * 0.7) * 0.4;
    for (const h of hoppers) {
      h.g.position.set(Math.cos(t * 0.35 + h.a) * h.r + 20, Math.abs(Math.sin(t * 5 + h.a)) * 0.22, 70 + Math.sin(t * 0.35 + h.a) * h.r * 0.3);
      h.g.rotation.y = t * 0.35 + h.a;
    }
  });
}

function summer(group, B, anim, tier, sand) {
  const sandM = new THREE.Mesh(new THREE.PlaneGeometry(70, 5.5), sand);
  sandM.rotation.x = -Math.PI / 2; sandM.position.set(48, 0.04, 132.2); group.add(sandM);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(68, 2.2), new THREE.MeshPhysicalMaterial({ color: '#3aa0c8', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.8 }));
  water.rotation.x = -Math.PI / 2; water.position.set(48, 0.05, 135.2); group.add(water);
  for (let i = 0; i < (tier === 'low' ? 2 : 4); i++) {
    const x = 18 + i * 16;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), std('#f2f2f2'));
    pole.position.set(x, 0.9, 131.6); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.35, 8), std(i % 2 ? '#e25b4a' : '#f2d15a', { r: 0.7 }));
    top.position.set(x, 1.85, 131.6); group.add(top);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.45), std('#f7f4ee', { r: 0.8 }));
    chair.position.set(x + 1.3, 0.25, 131.5); group.add(chair);
    const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 6), std('#8a5a32', { r: 0.8 }));
    palm.position.set(x - 1.5, 1.2, 132.6); group.add(palm);
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 6), std('#2f8a3a', { r: 0.8 }));
    frond.position.set(x - 1.5, 2.5, 132.6); group.add(frond);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), std('#f25a5a', { r: 0.4 }));
  ball.position.set(30, 0.28, 131.8); group.add(ball);
  const ducks = [];
  for (let i = 0; i < B.duck; i++) {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), std('#f4f1e4', { r: 0.6 }));
    body.scale.set(1.3, 0.8, 1); d.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std('#3a8a3a'));
    head.position.set(0.16, 0.16, 0); d.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), std('#e0a030'));
    beak.rotation.z = -Math.PI / 2; beak.position.set(0.28, 0.16, 0); d.add(beak);
    group.add(d); ducks.push({ d, p: i * 1.7, x: 22 + i * 10 });
  }
  anim.push(t => {
    ball.rotation.z = t;
    ball.position.x = 30 + Math.sin(t * 0.6) * 1.2;
    for (const dk of ducks) {
      dk.d.position.set(dk.x + Math.sin(t * 0.5 + dk.p) * 3, 0.2 + Math.abs(Math.sin(t * 8 + dk.p)) * 0.04, 135.2);
      dk.d.rotation.y = Math.cos(t * 0.5 + dk.p) > 0 ? 0.6 : 2.4;
    }
  });
}

function july4(hub, group, B, anim, tier) {
  boardLocal(hub, 'FOURTH OF JULY', 'NIGHT AVENUE', '#fff', '#1a2a6a', 0, 3.2, 0, 6);
  for (let i = 0; i < (tier === 'low' ? 2 : 5); i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 5), std('#dddddd', { m: 0.3 }));
    const x = -6 + i * 3; pole.position.set(x, 1.2, -1.5); hub.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), std('#f2f2f2', { r: 0.7 }));
    flag.position.set(x + 0.45, 2.2, -1.5); hub.add(flag);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), std('#c0392b'));
    stripe.position.set(x + 0.45, 2.35, -1.48); hub.add(stripe);
  }
  const bunting = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.45), std('#24508a', { e: '#204080', ei: 0.2 }));
  bunting.position.set(0, 3.8, -2); hub.add(bunting);
  fireworks(group, anim, B.fw, tier);
}

function fall(hub, group, B, anim, tier, leafMat) {
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), std('#e07a18', { e: '#ff8a20', ei: 0.35, r: 0.6 }));
  head.position.y = 1.1; hub.add(head);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.08), std('#2a1208', { e: '#ffb060', ei: 0.8 }));
  face.position.set(0, 1.05, 0.66); hub.add(face);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), std('#3a6a28'));
  stem.position.set(0, 1.85, 0); hub.add(stem);
  boardLocal(hub, 'AUTUMN NIGHT', 'FALL ON THE AVENUE', '#fff0d8', '#8a3d12', 0, 2.8, -2);
  scatterPumpkins(group, tier === 'low' ? 5 : 10);
  const crow = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 5), std('#6a5030', { r: 0.9 }));
  post.position.y = 0.9; crow.add(post);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), std('#6a5030'));
  arms.position.y = 1.4; crow.add(arms);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 6), std('#3a2a22'));
  hat.position.y = 1.9; crow.add(hat);
  crow.position.set(4, 0, 1); hub.add(crow);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(5.5, 12), leafMat);
  patch.rotation.x = -Math.PI / 2; patch.position.set(0, 0.05, 1.5); hub.add(patch);
  anim.push(t => { head.rotation.y = Math.sin(t * 0.6) * 0.15; });
}

function fireworks(group, anim, n, tier) {
  const bursts = [];
  for (let i = 0; i < n; i++) {
    const count = tier === 'low' ? 8 : 14;
    const pos = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: ['#ffd24a', '#ff5a7a', '#9fd0ff', '#fff'][i % 4], size: 0.18, transparent: true, opacity: 1, depthWrite: false });
    const pts = new THREE.Points(geo, mat); group.add(pts);
    bursts.push({ pos, geo, mat, life: Math.random() * 1.8, vel: new Float32Array(count * 3), count, ox: 40 + (i % 5) * 18, oz: 60 + (i % 3) * 8 });
    resetBurst(bursts[i]);
  }
  anim.push((t, dt) => {
    for (const b of bursts) {
      b.life += dt;
      if (b.life > 1.7) { b.life = 0; resetBurst(b); }
      for (let i = 0; i < b.count; i++) {
        b.pos[i * 3] += b.vel[i * 3] * dt;
        b.pos[i * 3 + 1] += b.vel[i * 3 + 1] * dt;
        b.vel[i * 3 + 1] -= 1.4 * dt;
        b.pos[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      }
      b.mat.opacity = Math.max(0, 1 - b.life / 1.7);
      b.geo.attributes.position.needsUpdate = true;
    }
  });
}
function resetBurst(b) {
  const y = 12 + Math.random() * 6;
  for (let i = 0; i < b.count; i++) {
    b.pos[i * 3] = b.ox; b.pos[i * 3 + 1] = y; b.pos[i * 3 + 2] = b.oz;
    const a = Math.random() * 6.28, u = Math.random();
    b.vel[i * 3] = Math.cos(a) * (2 + u * 3);
    b.vel[i * 3 + 1] = (Math.random() - 0.2) * 4;
    b.vel[i * 3 + 2] = Math.sin(a) * (2 + u * 3);
  }
}

function scatterPumpkins(group, n) {
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), std(i % 2 ? '#e07a20' : '#c45018', { r: 0.75 }));
    p.position.set(18 + (i * 11) % 80, 0.28, i % 2 ? 62.4 : 85.4); group.add(p);
  }
}
function boardLocal(parent, text, sub, fg, bg, x, y, z, w) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 4.2, (w || 4.2) * 0.42), signMat(text, sub, fg, bg));
  m.position.set(x, y, z); parent.add(m); return m;
}
