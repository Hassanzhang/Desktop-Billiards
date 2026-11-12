const invoke = window.__TAURI__?.core.invoke;
const $ = id => document.getElementById(id);
const error = message => { $('error').textContent = String(message); $('error').hidden = false; };
let busy = false;
let guide = true;
const hints = { ready: '瞄准 · 向后拉杆 · 松手击球', pull: '拉杆中 · 松手击球 · 右键 / 空格取消', stroke: '击球', rolling: '图标滚动中', return_white: '白球入袋 · 请点击台面空处摆球', ball_in_hand: '白球入袋 · 点击台面空处摆球', finished: '清台 · 本局完成' };
async function start() {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  $('hint').textContent = '正在读取桌面图标，请留意系统权限提示…';
  $('start').disabled = true;
  let timeout;
  try {
    const count = await Promise.race([
      invoke('prepare_desktop'),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('读取桌面图标超时，请检查系统权限后重试。')), 45000);
      }),
    ]);
    clearTimeout(timeout);
    $('hint').textContent = `已读取 ${count} 个图标，正在创建台面…`;
    await invoke('open_game');
  } catch (e) { error(e); $('hint').textContent = '启动失败，请检查错误后重试'; }
  finally { clearTimeout(timeout); busy = false; $('start').disabled = false; }
}
$('start').onclick = start;
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
    $('start').hidden = Boolean(state);
    $('restart').hidden = $('stop').hidden = !state;
    if (state) {
      $('hint').textContent = hints[state.phase];
      $('time').textContent = `${String(Math.floor(state.seconds / 60)).padStart(2, '0')}:${String(state.seconds % 60).padStart(2, '0')}`;
      $('count').textContent = `${state.pocketed}/${state.total}`;
      $('remaining').textContent = state.total - state.pocketed;
      $('mode').textContent = '桌面模式 · Esc / Ctrl+Alt+X 退出';
    } else if (!busy) { $('hint').textContent = '鼠标瞄准 · 向后拉杆 · 松手击球'; $('mode').textContent = 'Esc / Ctrl+Alt+X 退出'; }
  } catch (e) { error(e); }
  setTimeout(refresh, 150);
}
refresh();
