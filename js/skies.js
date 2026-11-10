// Personal sky choice. Saved on this device. It never changes the host's simulation.
export const SKIES = [
  { id: 'night', name: 'Default Night', kind: 0, price: 0, fog: '#243044', hemi: '#8aa0c8', ground: '#2a241c', moon: '#dfe6ff', moonI: 1 },
  { id: 'blackhole', name: 'Black Hole', kind: 1, price: 0, fog: '#140806', hemi: '#ff9966', ground: '#1a0c08', moon: '#ffbb88', moonI: .35 },
  { id: 'pink', name: 'Pink Sky', kind: 2, price: 0, fog: '#5a3048', hemi: '#ffb0c8', ground: '#3a2430', moon: '#ffe0ea', moonI: .7 },
  { id: 'space', name: 'Deep Space', kind: 3, price: 0, fog: '#0c1020', hemi: '#9ab0d8', ground: '#101018', moon: '#eef2ff', moonI: 1.1 },
  { id: 'galaxy', name: 'Galaxy', kind: 4, price: 0, fog: '#1a1028', hemi: '#d090c8', ground: '#140c18', moon: '#ffe0c0', moonI: .8 },
  { id: 'aurora', name: 'Aurora', kind: 5, price: 0, fog: '#0c2018', hemi: '#8ae0b0', ground: '#101810', moon: '#d8fff0', moonI: .6 },
  { id: 'bloodmoon', name: 'Blood Moon', kind: 6, price: 0, fog: '#2a0808', hemi: '#ff6a55', ground: '#1a0808', moon: '#ff4030', moonI: 1.4 },
  { id: 'twomoons', name: 'Two Moons', kind: 7, price: 0, fog: '#102028', hemi: '#9ad0c0', ground: '#101820', moon: '#d8f0e0', moonI: .5 },
  { id: 'meteors', name: 'Meteor Shower', kind: 8, price: 0, fog: '#101018', hemi: '#c8d0e8', ground: '#12141c', moon: '#fff4d8', moonI: .9 },
];

const KEY = 'nhSky';

export function skyById(id) {
  return SKIES.find(s => s.id === id) || SKIES[0];
}

export function loadSky(storage) {
  let id = '';
  try { id = (storage || localStorage).getItem(KEY) || ''; } catch (e) { id = ''; }
  return skyById(id);
}

export function saveSky(id, storage) {
  const sky = skyById(id);
  try { (storage || localStorage).setItem(KEY, sky.id); } catch (e) { /* private mode */ }
  return sky;
}
