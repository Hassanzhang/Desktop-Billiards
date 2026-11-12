import { createRenderer } from './table-renderer.js';
const { core: { invoke }, event: { listen } } = window.__TAURI__;
const $ = id => document.getElementById(id);
const canvas = $('table');
const pointer = { x: 0, y: 0, press: null, move_aim: false, turn: 0, shot: null, release: false, place: false, cancel: false };
let stopped = false;
let lastTable;
let initial;
let selectedPower = .35;
let renderer = null;
let lastScore = '';
let lastHint = '';
let prevSunk = null;
let prevPhase = null;
let introPending = true;
let lastInvoke = 0;
// Clock refresh cadence for the idle loop: while nothing moves we stop the
// per-frame IPC and only wake up about once a second to update the timer.
const IDLE_MS = 900;
// Kill-streak banners, keyed by the asset name the backend announces.
const ANNOUNCE_ASSETS = ['01_First_Blood', '02_Double_Kill', '03_Triple_Kill', '04_Quadra_Kill', '05_Penta_Kill'];
const announceImages = new Map();
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
  if (event.key === ' ' && lastTable?.phase === 'pull') { event.preventDefault(); cancel(); return; }
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
listen('announce', event => {
  const name = event.payload;
  const banner = $('announce');
  const slot = $('announce-img');
  const image = announceImages.get(name);
  slot.src = image ? image.src : `assets/${name}.png`;
  // Restart the animation so back-to-back announcements replay cleanly.
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
});
listen('restarted', () => {
  // A restart deals a new random fourteen: reload items, icons and sprites.
  introPending = true; prevSunk = null;
  loadTable().catch(error => { $('table-error').textContent = `${error}\n请在控制面板结束本局后重试。`; });
});
$('power').addEventListener('input', event => { selectedPower = Number(event.target.value) / 100; $('power-value').value = `${event.target.value}%`; });
$('shoot').onclick = () => { pointer.shot = selectedPower; canvas.focus(); };

function updateControls(table) {
  const charge = table.phase === 'pull' || table.phase === 'stroke' ? table.charge : selectedPower;
  $('power').value = Math.round(charge * 100);
  $('power-value').value = `${Math.round(charge * 100)}%`;
  $('power').disabled = table.phase !== 'ready';
  $('shoot').disabled = table.phase !== 'ready';
  $('shot-controls').classList.toggle('pulling', table.phase === 'pull');
  const score = `${table.pocketed} / ${initial.items.length} 入袋 · ${String(Math.floor(table.seconds / 60)).padStart(2, '0')}:${String(table.seconds % 60).padStart(2, '0')}`;
  if (score !== lastScore) { lastScore = score; $('table-score').textContent = score; }
  const hint = table.phase === 'finished' ? '清台完成 · 在控制面板重新开始'
    : table.phase === 'failed' ? '黑八提前入袋 · 游戏失败 · 在控制面板重新开始'
    : table.phase === 'ball_in_hand' ? '白球入袋 · 点击台面空处摆球'
    : table.phase === 'return_white' ? '白球入袋 · 请点击台面空处摆球'
    : table.phase === 'pull' ? '方向已锁定 · 向后拉杆 · 松手击球 · 右键 / 空格取消'
    : table.phase === 'stroke' || table.phase === 'rolling' ? '图标滚动中…'
    : table.pocketed === initial.items.length ? '只剩黑八 · 最后打进即获胜 · 移动瞄准 · 按住向后拉杆 · 松手击球'
    : '移动瞄准 · 按住向后拉杆 · 松手击球 · ← → / 滚轮微调';
  if (hint !== lastHint) { lastHint = hint; $('table-hint').textContent = hint; }
  let hover = -1;
  if (table.phase === 'ready' && !renderer?.busy) {
    for (let i = 1; i < table.xs.length; i++) {
      if (i === initial.black8) continue;
      if (!table.sunk[i] && Math.hypot(pointer.x - table.xs[i], pointer.y - table.ys[i]) < initial.radius) {
        hover = i; break;
      }
    }
  }
  const tooltip = $('file-name');
  tooltip.hidden = hover < 0;
  if (hover > 0) {
    tooltip.textContent = initial.items[hover < initial.black8 ? hover - 1 : hover - 2].name;
    const bx = table.xs[hover], by = table.ys[hover];
    tooltip.style.left = `${Math.max(12, Math.min(initial.width - 232, bx - 100)) / initial.width * 100}%`;
    tooltip.style.top = `${Math.min(initial.height - 70, by + initial.radius + 12) / initial.height * 100}%`;
  }
}
async function frame() {
  if (stopped) return;
  try {
    const input = { ...pointer };
    const pending = input.press !== null || input.shot !== null || input.turn !== 0
      || input.release || input.place || input.cancel || input.move_aim;
    pointer.press = pointer.shot = null; pointer.turn = 0;
    pointer.release = pointer.place = pointer.cancel = pointer.move_aim = false;
    const animating = renderer?.busy
      || ['pull', 'stroke', 'rolling', 'return_white'].includes(lastTable?.phase)
      || (lastTable?.cue_follow ?? 0) > 0;
    if (pending || animating || Date.now() - lastInvoke >= IDLE_MS) {
      lastInvoke = Date.now();
      lastTable = await invoke('frame', { pointer: input });
      if (introPending) { renderer.playIntro(lastTable); introPending = false; }
      if (prevSunk) {
        for (let i = 0; i < lastTable.sunk.length; i++) {
          if (lastTable.sunk[i] && !prevSunk[i]) renderer.sink(i, lastTable.xs[i], lastTable.ys[i]);
        }
      }
      prevSunk = lastTable.sunk;
      // The instant the stroke launches the white, flash a tiny contact dot.
      if (prevPhase === 'stroke' && lastTable.phase === 'rolling' && !lastTable.sunk[0]) {
        renderer.flash(lastTable.xs[0], lastTable.ys[0], lastTable.aim);
      }
      prevPhase = lastTable.phase;
      renderer.draw(lastTable); updateControls(lastTable);
    }
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
async function loadTable() {
  initial = await invoke('initial');
  const background = initial.wallpaper ? await loadImage(initial.wallpaper).catch(() => null) : null;
  const images = await Promise.all(initial.items.map(item => item.image ? loadImage(item.image).catch(() => { throw new Error(`图标加载失败：${item.name}`); }) : null));
  const [frameAsset, cueAsset, matcapAsset] = await Promise.all([
    loadImage('assets/table-frame.png'),
    loadImage('assets/cue.png'),
    loadImage('assets/ball-matcap.png'),
  ]);
  renderer = createRenderer(canvas, initial, images, background, frameAsset, cueAsset, matcapAsset);
  // Warm the banner assets in the background so the first announcement
  // never pops in late.
  for (const name of ANNOUNCE_ASSETS) {
    loadImage(`assets/${name}.png`).then(image => announceImages.set(name, image)).catch(() => {});
  }
}
try {
  await loadTable();
  canvas.focus(); frame();
} catch (error) { $('table-error').textContent = `${error}\n请在控制面板结束本局后重试。`; }
