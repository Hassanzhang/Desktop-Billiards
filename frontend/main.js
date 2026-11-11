const invoke = window.__TAURI__?.core.invoke;
const $ = id => document.getElementById(id);
const error = message => { $('error').textContent = String(message); $('error').hidden = false; };
let busy = false;
let guide = true;
const hints = { ready: '瞄准 · 向后拉杆 · 松手击球', stroke: '击球', rolling: '图标滚动中', return_white: '白球入袋 · 正在摆回', ball_in_hand: '白球入袋 · 点击台面空处摆球', finished: '清台 · 本局完成' };
async function start(demo) {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  $('hint').textContent = demo ? '正在准备试玩…' : '正在读取桌面图标，请留意系统权限提示…';
  $('start').disabled = $('demo').disabled = true;
  let timeout;
  try {
    const items = await Promise.race([
      invoke('prepare_desktop', { demo }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('读取桌面图标超时，请检查系统权限后重试，或使用窗口试玩。')), 45000);
      }),
    ]);
    clearTimeout(timeout);
    $('hint').textContent = '图标准备完成，正在创建台面…';
    await invoke('open_game', { items, demo });
  } catch (e) { error(e); $('hint').textContent = '启动失败，可重试或使用窗口试玩'; }
  finally { clearTimeout(timeout); busy = false; $('start').disabled = $('demo').disabled = false; }
}
$('start').onclick = () => start(false);
$('demo').onclick = () => start(true);
$('restart').onclick = () => invoke('restart').catch(error);
$('stop').onclick = () => invoke('stop_game').catch(error);
$('quit').onclick = () => invoke('quit').catch(error);
$('guide').onclick = async () => {
  const next = !guide;
  try { await invoke('toggle_guide', { enabled: next }); guide = next; $('guide').textContent = `辅助线 · ${guide ? '开' : '关'}`; $('guide').setAttribute('aria-pressed', String(guide)); } catch (e) { error(e); }
};
window.addEventListener('keydown', e => { if (e.key === 'Escape') invoke('quit').catch(error); });
async function refresh() {
  if (!invoke) { error('请通过 npm run dev 启动 Tauri 应用。浏览器无法读取原生桌面。'); return; }
  try {
    const state = await invoke('status');
    $('start').hidden = $('demo').hidden = Boolean(state);
    $('restart').hidden = $('stop').hidden = !state;
    if (state) {
      $('hint').textContent = hints[state.phase];
      $('time').textContent = `${String(Math.floor(state.seconds / 60)).padStart(2, '0')}:${String(state.seconds % 60).padStart(2, '0')}`;
      $('count').textContent = `${state.pocketed}/${state.total}`;
      $('remaining').textContent = state.total - state.pocketed;
      $('mode').textContent = state.demo ? '窗口试玩 · 使用示例图标' : '桌面模式 · Esc / Ctrl+Alt+X 退出';
    } else if (!busy) { $('hint').textContent = '鼠标瞄准 · 向后拉杆 · 松手击球'; $('mode').textContent = 'Esc / Ctrl+Alt+X 退出'; }
  } catch (e) { error(e); }
  setTimeout(refresh, 150);
}
refresh();
