// Input/IPC regression without a browser: node tests/table-input.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    value: '35', style: {}, classList: { toggle() {} }, events: {},
    addEventListener(name, callback) { this.events[name] = callback; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
    setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {}, focus() {},
  });
  return elements.get(id);
};
const inputs = [];
const events = {};
let nextFrame;
let table = { phase: 'ready', pulling: false, charge: 0, seconds: 0, balls: [{ x: 100, y: 100, radius: 20, sunk: false }, { x: 500, y: 350, radius: 20, sunk: false }] };
const context = vm.createContext({
  document: { getElementById: element },
  window: {
    __TAURI__: { core: { invoke: async (command, args) => {
      if (command === 'initial') return { width: 1000, height: 700, items: [{ name: 'test', image: '' }], demo: true, guide: true };
      if (command === 'frame') { inputs.push(args.pointer); return table; }
    } }, event: { listen() {} } },
    addEventListener: (name, callback) => { events[name] = callback; },
  },
  requestAnimationFrame: callback => { nextFrame = callback; },
  createRenderer: () => () => {},
});
const source = readFileSync(new URL('../frontend/table.js', import.meta.url), 'utf8').replace(/^import .*\n/, '');
await vm.runInContext(`(async () => { ${source} })()`, context);
await Promise.resolve();
const canvas = element('table');
const mouse = (x, y) => ({ clientX: x, clientY: y, button: 0, pointerId: 1 });
canvas.events.pointerdown(mouse(600, 350));
canvas.events.pointermove(mouse(450, 390));
canvas.events.pointerup(mouse(450, 390));
await nextFrame();
assert.equal(JSON.stringify(inputs.at(-1).press), '[600,350]');
assert.equal(inputs.at(-1).x, 450);
assert.equal(inputs.at(-1).release, true, 'Fast gestures must preserve press and release in one IPC frame');
await nextFrame();
assert.equal(inputs.at(-1).press, null);
assert.equal(inputs.at(-1).release, false, 'Input edges must be consumed once');
canvas.events.pointerdown(mouse(600, 350));
events.blur();
await nextFrame();
assert.equal(inputs.at(-1).cancel, true);
assert.equal(inputs.at(-1).press, null);
assert.equal(inputs.at(-1).release, false);
const key = key => ({ key, target: { matches: () => false }, preventDefault() {} });
events.keydown(key('ArrowLeft'));
await nextFrame();
assert.ok(inputs.at(-1).turn < 0);
assert.equal(inputs.at(-1).move_aim, false, 'Fine aiming must not be overwritten by a stationary pointer');
element('shoot').onclick();
await nextFrame();
assert.equal(inputs.at(-1).shot, .35);
table = { ...table, phase: 'ball_in_hand' };
await nextFrame();
canvas.events.pointerdown(mouse(400, 400));
await nextFrame();
assert.equal(inputs.at(-1).place, true);
assert.equal(inputs.at(-1).press, null, 'Placing the cue ball must not begin a pull');
console.log('PASS: fast drag, consumed edges, blur cancel, fine aiming, alternate shot, ball placement');
