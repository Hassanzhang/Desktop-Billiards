// Resource lifecycle check; simulated Canvas API, not a GPU memory benchmark.
import assert from 'node:assert/strict';
import { createRenderer } from '../frontend/table-renderer.js';
const canvases = [];
const gradient = { addColorStop() {} };
const makeCanvas = () => {
  const draws = [];
  const ctx = new Proxy({
    draws,
    drawImage: source => draws.push(source),
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createPattern: () => ({}),
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  canvases.push(canvas);
  return canvas;
};
globalThis.document = { createElement: makeCanvas };
globalThis.window = { devicePixelRatio: 1 };
const initial = { width: 3840, height: 2160, radius: 23, black8: 1, bounds: [100, 100, 3700, 2000], pocket_radius: 38, max_pull: 180, guide: false };
const canvas = makeCanvas();
const renderer = createRenderer(canvas, initial, [], null, {}, { naturalWidth: 1, naturalHeight: 1 }, {});
const table = { phase: 'ready', xs: [600, 900], ys: [600, 900], sunk: [false, false], aim: [1, 0], charge: 0, cue_follow: 0, stroke_origin: [600, 600], stroke_progress: 0, guide: [] };
for (const scale of [1, 2]) {
  window.devicePixelRatio = scale;
  table.phase = 'ready'; renderer.draw(table);
  const allocated = canvases.length;
  for (let shot = 0; shot < 100; shot++) {
    for (const phase of ['pull', 'stroke', 'rolling', 'ball_in_hand', 'ready']) {
      table.phase = phase;
      canvas.getContext().draws.length = 0;
      renderer.draw(table);
      if (phase === 'rolling' || phase === 'ball_in_hand') {
        assert.equal(canvas.getContext().draws.length, 2, 'Hidden cue and its shadow must not be drawn');
      } else {
        assert.equal(canvas.getContext().draws.length, 4, 'Visible cue and shadow must return on the next shot');
      }
    }
  }
  assert.equal(canvases.length, allocated, 'Repeated shots must reuse backing canvases at a stable DPR');
}
console.log('PASS: 200 simulated shots at DPR 1/2 reuse canvases; hidden cue does not leave a ghost');
