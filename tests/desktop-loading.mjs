// Run with: node tests/desktop-loading.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const elements = new Map();
const element = id => {
  assert.notEqual(id, 'demo', 'The removed demo control must not be accessed');
  if (!elements.has(id)) elements.set(id, { setAttribute() {} });
  return elements.get(id);
};
const timers = new Map();
const opened = [];
let prepare;
let nextTimer = 0;
const context = vm.createContext({
  document: { getElementById: element },
  window: {
    __TAURI__: { core: { invoke: async (command, args) => {
      if (command === 'prepare_desktop') return prepare();
      if (command === 'open_game') opened.push(command);
      return null;
    } } },
    addEventListener() {},
  },
  setTimeout: (callback, delay) => {
    const id = ++nextTimer;
    if (delay === 45000) timers.set(id, callback);
    return id;
  },
  clearTimeout: id => timers.delete(id),
});
vm.runInContext(readFileSync(new URL('../frontend/main.js', import.meta.url), 'utf8'), context);

prepare = async () => { throw new Error('Not authorized (-1743)'); };
await vm.runInContext('start()', context);
assert.match(element('error').textContent, /-1743/);
assert.equal(element('start').disabled, false);
assert.equal(timers.size, 0);

let resolveLate;
prepare = () => new Promise(resolve => { resolveLate = resolve; });
const pending = vm.runInContext('start()', context);
assert.equal(element('start').disabled, true);
assert.equal(timers.size, 1);
[...timers.values()][0]();
await pending;
assert.match(element('error').textContent, /超时/);
assert.equal(element('start').disabled, false);
resolveLate(51);
await Promise.resolve();
assert.equal(opened.length, 0, 'A timed-out result must never open a game');
prepare = async () => 51;
await vm.runInContext('start()', context);
assert.equal(opened.length, 1);
assert.equal(opened[0], 'open_game');
assert.equal(timers.size, 0);
console.log('PASS: permission error, timeout, late result ignored, desktop retry');
