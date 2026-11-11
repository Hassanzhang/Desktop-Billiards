import { createRenderer } from './table-renderer.js';
const { core: { invoke }, event: { listen } } = window.__TAURI__;
const $ = id => document.getElementById(id);
const canvas = $('table');
const pointer = { x: 0, y: 0, press: null, move_aim: false, turn: 0, shot: null, release: false, place: false, cancel: false };
let stopped = false;
let lastTable;
let initial;
let selectedPower = .35;
let render;
let lastScore = '';
let lastHint = '';
function cancel() {
  pointer.cancel = true; pointer.press = null; pointer.shot = null;
  pointer.release = pointer.place = false; pointer.turn = 0;
}
function locate(event) {
  if (!initial) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * initial.width / rect.width;
  pointer.y = (event.clientY - rect.top) * initial.height / rect.height;
}
canvas.addEventListener('pointermove', event => { locate(event); pointer.move_aim = true; });
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  locate(event); canvas.setPointerCapture(event.pointerId); canvas.focus();
  pointer.cancel = false;
  if (lastTable?.phase === 'ball_in_hand') pointer.place = true;
  else pointer.press = [pointer.x, pointer.y];
});
canvas.addEventListener('pointerup', event => {
  if (event.button !== 0) return;
  locate(event); pointer.release = true;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', cancel);
window.addEventListener('blur', cancel);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') { invoke('quit'); return; }
  if (event.key === ' ' && lastTable?.pulling) { event.preventDefault(); cancel(); return; }
  if (event.target.matches('input, button')) return;
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); pointer.turn += (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? .00044 : .0026);
  }
  if (event.key === 'Enter') { event.preventDefault(); pointer.shot = selectedPower; }
});
canvas.addEventListener('wheel', event => {
  event.preventDefault(); pointer.turn += Math.sign(event.deltaY) * .00175;
}, { passive: false });
window.addEventListener('contextmenu', event => { event.preventDefault(); cancel(); });
listen('guide', event => { if (initial) initial.guide = event.payload; });
$('power').addEventListener('input', event => { selectedPower = Number(event.target.value) / 100; $('power-value').value = `${event.target.value}%`; });
$('shoot').onclick = () => { pointer.shot = selectedPower; canvas.focus(); };

function updateControls(table) {
  const active = ['ready', 'stroke'].includes(table.phase);
  const charge = table.pulling || table.phase === 'stroke' ? table.charge : selectedPower;
  $('power').value = Math.round(charge * 100);
  $('power-value').value = `${Math.round(charge * 100)}%`;
  $('power').disabled = table.phase !== 'ready' || table.pulling;
  $('shoot').disabled = table.phase !== 'ready' || table.pulling;
  $('shot-controls').classList.toggle('pulling', table.pulling);
  const score = `${table.pocketed} / ${initial.items.length} 入袋 · ${String(Math.floor(table.seconds / 60)).padStart(2, '0')}:${String(table.seconds % 60).padStart(2, '0')}`;
  if (score !== lastScore) { lastScore = score; $('table-score').textContent = score; }
  const hint = table.phase === 'finished' ? '清台完成 · 在控制面板重新开始'
    : table.phase === 'ball_in_hand' ? '白球入袋 · 点击台面空处摆球'
    : table.phase === 'return_white' ? '白球入袋 · 正在复位'
    : table.pulling ? '方向已锁定 · 向后拉杆 · 松手击球 · 右键 / 空格取消'
    : !active ? '图标滚动中…'
    : '移动瞄准 · 按住向后拉杆 · 松手击球 · ← → / 滚轮微调';
  if (hint !== lastHint) { lastHint = hint; $('table-hint').textContent = hint; }
  let hover = -1;
  if (!table.pulling && table.phase === 'ready') {
    for (let i = 1; i < table.xs.length; i++) {
      if (!table.sunk[i] && Math.hypot(pointer.x - table.xs[i], pointer.y - table.ys[i]) < initial.radius) {
        hover = i; break;
      }
    }
  }
  const tooltip = $('file-name');
  tooltip.hidden = hover < 0;
  if (hover > 0) {
    tooltip.textContent = initial.items[hover - 1].name;
    const bx = table.xs[hover], by = table.ys[hover];
    tooltip.style.left = `${Math.max(12, Math.min(initial.width - 232, bx - 100)) / initial.width * 100}%`;
    tooltip.style.top = `${Math.min(initial.height - 70, by + initial.radius + 12) / initial.height * 100}%`;
  }
}
async function frame() {
  if (stopped) return;
  try {
    const input = { ...pointer };
    pointer.press = pointer.shot = null; pointer.turn = 0;
    pointer.release = pointer.place = pointer.cancel = pointer.move_aim = false;
    lastTable = await invoke('frame', { pointer: input });
    render(lastTable); updateControls(lastTable);
    requestAnimationFrame(frame);
  } catch (error) {
    stopped = true; cancel();
    $('power').disabled = $('shoot').disabled = true;
    $('table-error').textContent = `${error}\n请在控制面板结束本局，或按 Esc 退出。`;
  }
}
const loadImage = src => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});
try {
  initial = await invoke('initial');
  const background = initial.wallpaper ? await loadImage(initial.wallpaper).catch(() => null) : null;
  const images = await Promise.all(initial.items.map(item => item.image ? loadImage(item.image).catch(() => { throw new Error(`图标加载失败：${item.name}`); }) : null));
  const frameAsset = await loadImage('assets/table-frame.png');
  render = createRenderer(canvas, initial, images, background, frameAsset);
  canvas.focus(); frame();
} catch (error) { $('table-error').textContent = `${error}\n请在控制面板结束本局后重试。`; }
