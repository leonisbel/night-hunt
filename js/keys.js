// Desktop key legend. Tab is the scoreboard, so the guide itself is F1. H hides the HUD.
export const GUIDE_KEY = 'F1';
export const HUD_KEY = 'KeyH';

export const KEYS = [
  ['W A S D', 'Move'],
  ['↑ ↓', 'Move'],
  ['← →', 'Turn the camera'],
  ['Shift', 'Sprint'],
  ['Space', 'Attack, use an item, or use the monster ability'],
  ['Click', 'Same as Space'],
  ['E', 'Interact: open, sit, elevator, wake up'],
  ['Q', 'Monster ability'],
  ['Z', 'Speed coil'],
  ['X', 'Gravity coil'],
  ['C', 'Invisibility'],
  ['1–6', 'Choose a hotbar slot'],
  ['G', 'Drop the selected item'],
  ['B', 'Emote wheel'],
  ['Tab', 'Scoreboard while held'],
  ['M', 'Mute'],
  ['H', 'Hide or show the HUD'],
  ['F1', 'Show or hide this key guide'],
  ['N', 'Spectate the next player'],
  ['Jump', 'Not used. There is no jump key.'],
];

const TAKEN = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE', 'KeyQ', 'KeyZ', 'KeyX', 'KeyC', 'KeyG', 'KeyB', 'Tab', 'KeyM', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

export function guideKeyFree() { return GUIDE_KEY === 'F1' && !TAKEN.includes('F1') && !TAKEN.includes(HUD_KEY); }

export function hudShown(stored) { return stored !== '0'; }
export function nextHud(stored) { return hudShown(stored) ? '0' : '1'; }

// Desktop only. Touch never shows the legend. A round start shows it until the timer ends, unless F1 pinned it.
export function guideOpen({ touch, pinned, auto }) {
  if (touch) return false;
  if (pinned === 'open') return true;
  if (pinned === 'shut') return false;
  return !!auto;
}
