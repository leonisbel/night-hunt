// Neon Spire dressing: glass towers, holographic signs, a maglev ribbon,
// sky-lane traffic and drones. Traffic does not collide. Counts shrink on low graphics.
import * as THREE from '../vendor/three.module.min.js';

const S = 1 / 20;
const BUDGET = {
  low: { win: 70, fly: 3, drone: 4, lamp: 8 },
  med: { win: 180, fly: 5, drone: 8, lamp: 16 },
  high: { win: 320, fly: 7, drone: 12, lamp: 24 },
  ultra: { win: 420, fly: 8, drone: 14, lamp: 28 },
};

function holo(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#05070ee6'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = color; g.lineWidth = 8; g.strokeRect(12, 12, 488, 136);
  g.fillStyle = color; g.font = 'bold 42px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 22; g.fillText(text, 256, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false });
}
function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.45, metalness: o.m ?? 0.2, emissive: o.e || '#000', emissiveIntensity: o.ei || 0 });
}

export function dressFuture(map, tier) {
  const group = new THREE.Group(); group.name = 'future';
  const B = BUDGET[tier] || BUDGET.high;
  const steel = std('#d5dde6', { m: 0.82, r: 0.22 });
  const facade = (hex) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#101820'; g.fillRect(0, 0, 128, 256);
    g.strokeStyle = '#9eb0c0'; g.lineWidth = 2;
    for (let y = 0; y <= 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    for (let x = 0; x <= 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let y = 2; y < 256; y += 16) for (let x = 2; x < 128; x += 16) {
      const lit = ((x * 3 + y) % 48) > 10;
      g.fillStyle = !lit ? '#070b10' : ((x + y) % 64 === 0 ? '#ff4ad8' : hex);
      g.fillRect(x, y, 12, 12);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshPhysicalMaterial({ map: t, emissiveMap: t, color: '#e7f4fb', emissive: hex, emissiveIntensity: 0.55, roughness: 0.16, metalness: 0.58, transparent: true, opacity: 0.96, envMapIntensity: 1, side: THREE.DoubleSide });
  };
  const neon = std('#10141c', { e: '#39f0ff', ei: 1.8, m: 0.35, r: 0.3 });
  const spires = (map.bld || []).filter(b => b.kind === 'spire');
  const dummy = new THREE.Object3D();
  const winMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
  const wins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.28, 0.05), winMat, Math.max(1, B.win));
  wins.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, B.win) * 3), 3);
  wins.count = 0; group.add(wins);
  const flick = [];
  const paintWin = (x, y, z, color, sx = 1) => {
    if (wins.count >= B.win) return;
    dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(sx, 1, 1); dummy.updateMatrix();
    const i = wins.count++;
    wins.setMatrixAt(i, dummy.matrix);
    wins.setColorAt(i, new THREE.Color(color));
  };
  spires.forEach((b, i) => {
    const floors = b.floors || 4;
    const H = 42 + floors * 8;
    const w = b.w * S * 0.88, d = b.h * S * 0.88;
    const cx = (b.x + b.w / 2) * S, cz = (b.y + b.h / 2) * S;
    const col = b.light || '#7af6ff';
    const tiers = [[0, 0.58, 1], [0.58, 0.26, 0.7], [0.84, 0.16, 0.42]];
    tiers.forEach(([y0, hf, sc], ti) => {
      const h = H * hf;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * sc, h, d * sc), facade(col));
      body.position.set(cx, H * y0 + h / 2, cz);
      body.castShadow = tier !== 'low'; group.add(body);
      const rows = tier === 'low' ? 2 : (ti === 0 ? 5 : 3);
      const cols = tier === 'low' ? 2 : 4;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols && wins.count < B.win; c++) {
        const wx = cx - w * sc * 0.36 + c * (w * sc * 0.22);
        const wy = H * y0 + 1.4 + r * (h / (rows + 1));
        paintWin(wx, wy, cz - d * sc * 0.5 - 0.04, (r + c + i) % 7 === 0 ? '#ff4ad8' : col, 1);
      }
    });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 1.4, d * 0.22), steel);
    cap.position.set(cx, H + 0.7, cz); group.add(cap);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 6, 6), steel);
    mast.position.set(cx, H + 4, cz); group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: col }));
    beacon.position.set(cx, H + 7.2, cz); group.add(beacon); flick.push(beacon);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.12, 0.12), neon);
    strip.position.set(cx, 6.5, cz - d * 0.46); group.add(strip); flick.push(strip);
    if (tier !== 'low' && b.name && i < 6) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(9, w * 0.8), 1.6), holo(b.name, col));
      sign.position.set(cx, H * 0.62, cz - d * 0.48); group.add(sign);
    }
  });
  wins.instanceMatrix.needsUpdate = true; if (wins.instanceColor) wins.instanceColor.needsUpdate = true;

  const laneMat = new THREE.MeshBasicMaterial({ color: '#7af6ff' });
  for (const lane of map.lanes || []) {
    const z = (lane.y + lane.h / 2) * S;
    const dashes = tier === 'low' ? 10 : 22;
    for (let i = 0; i < dashes; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.16), laneMat);
      dash.position.set(8 + i * ((map.w * S - 16) / dashes), 0.08, z); group.add(dash);
    }
  }
  const cars = [];
  for (const rail of map.rails || []) {
    const z = rail.y * S;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(map.w * S * 0.9, 0.45, 1.4), steel);
    beam.position.set(map.w * S / 2, 18, z); group.add(beam);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(map.w * S * 0.9, 0.08, 0.28), neon);
    glow.position.set(beam.position.x, 17.7, z); group.add(glow); flick.push(glow);
    const nPillar = tier === 'low' ? 4 : 7;
    for (let i = 0; i < nPillar; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 18, 6), steel);
      p.position.set(12 + i * (map.w * S * 0.8 / nPillar), 9, z); group.add(p);
    }
    for (let i = 0; i < (tier === 'low' ? 1 : 2); i++) {
      const car = new THREE.Group();
      car.add(new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.3, 1.5), std(i ? '#f2fbff' : '#ffe0f4', { m: 0.7, r: 0.2, e: '#9ad7ff', ei: 0.35 })));
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 1.2), new THREE.MeshBasicMaterial({ color: '#7af6ff' }));
      nose.position.set(3.2, 0, 0); car.add(nose);
      car.userData = { z, y: 18.9, speed: 10 + i * 4, phase: i * 40 };
      group.add(car); cars.push(car);
    }
  }
  const flyers = [];
  const lanes = map.lanes || [];
  for (let i = 0; i < B.fly; i++) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 1.1), std(i % 2 ? '#e7f6ff' : '#ffd6ee', { m: 0.65, r: 0.22, e: '#8fd0ff', ei: 0.45 }));
    g.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.7), new THREE.MeshPhysicalMaterial({ color: '#9fd8ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75, emissive: '#7af6ff', emissiveIntensity: 0.4 }));
    cab.position.set(0.3, 0.32, 0); g.add(cab);
    const under = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.4), new THREE.MeshBasicMaterial({ color: i % 2 ? '#7af6ff' : '#ff4ad8' }));
    under.position.y = -0.26; g.add(under);
    const lane = lanes[i % Math.max(1, lanes.length)];
    g.userData = { y: 22 + (i % 3) * 6, z: lane ? (lane.y + lane.h / 2) * S : 30 + i * 12, speed: 14 + i * 3, phase: i * 17 };
    group.add(g); flyers.push(g);
  }
  const nLamp = B.lamp;
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 6), steel, nLamp);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.08, 0.22), neon, nLamp);
  poles.count = 0; heads.count = 0; group.add(poles, heads);
  for (let i = 0; i < nLamp; i++) {
    const avenue = lanes[i % Math.max(1, lanes.length)];
    const x = 10 + (i * 17) % Math.max(20, map.w * S - 20);
    const z = avenue ? (avenue.y * S + (i % 2 ? 3.2 : -3.2)) : 20 + i * 4;
    dummy.position.set(x, 2.6, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); poles.setMatrixAt(poles.count++, dummy.matrix);
    dummy.position.set(x, 5.25, z); dummy.updateMatrix(); heads.setMatrixAt(heads.count++, dummy.matrix);
    if (tier !== 'low' && i % 3 === 0) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.38, 0.48), std('#243044', { m: 0.45, r: 0.4 }));
      bench.position.set(x + 1.6, 0.28, z); group.add(bench);
    }
  }
  poles.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  if (tier !== 'low') {
    const boards = [['VOID MARKET', '#ff4ad8'], ['GLASS ORBIT', '#7af6ff'], ['DRIFT HALL', '#ffe08a'], ['NIGHT ANNEX', '#9d7bff']];
    boards.forEach((pair, i) => {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.2), holo(pair[0], pair[1]));
      const lane = lanes[i % Math.max(1, lanes.length)];
      board.position.set(18 + i * 28, 8 + (i % 2) * 3, lane ? lane.y * S + 6 : 24);
      group.add(board); flick.push(board);
    });
  }
  const drones = [];
  const dMat = std('#e8fbff', { e: '#7af6ff', ei: 2.2, m: 0.45, r: 0.25 });
  spires.forEach((b, i) => {
    if (drones.length >= B.drone) return;
    const d = new THREE.Group();
    d.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), dMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 6, 10), neon);
    ring.rotation.x = Math.PI / 2; d.add(ring);
    d.userData = { cx: (b.x + b.w / 2) * S, cz: (b.y + b.h / 2) * S, r: 6 + (i % 3) * 2, y: 16 + (b.floors || 3), sp: 0.35 + i * 0.04 };
    group.add(d); drones.push(d);
  });
  return {
    group,
    tick(t) {
      const span = map.w * S + 30;
      for (const g of flyers) {
        const x = ((t * g.userData.speed + g.userData.phase) % span) - 10;
        g.position.set(x, g.userData.y, g.userData.z);
      }
      for (const c of cars) {
        const x = ((t * c.userData.speed + c.userData.phase) % span) - 10;
        c.position.set(x, c.userData.y, c.userData.z);
      }
      for (const d of drones) {
        const a = t * d.userData.sp;
        d.position.set(d.userData.cx + Math.cos(a) * d.userData.r, d.userData.y + Math.sin(a * 2) * 1.2, d.userData.cz + Math.sin(a) * d.userData.r);
      }
      for (let i = 0; i < flick.length; i++) {
        const m = flick[i].material; if (!m) continue;
        const f = 0.55 + 0.45 * Math.sin(t * (2.2 + i) + i);
        if (m.emissiveIntensity != null && m.emissive) m.emissiveIntensity = 0.4 + f * 1.6;
        if (m.opacity != null && m.transparent) m.opacity = i % 4 === 0 ? 0.35 + f * 0.6 : (m.opacity > 0.9 ? m.opacity : 0.75 + f * 0.2);
      }
    },
  };
}
