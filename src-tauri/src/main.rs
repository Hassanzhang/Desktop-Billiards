#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod desktop;
mod physics;
use desktop::DesktopItem;
use physics::{Phase, Table};
use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct Game {
    table: Table,
    /// The full desktop pool kept so every restart deals a fresh random seven.
    pool: Vec<DesktopItem>,
    items: Vec<DesktopItem>,
    last: Instant,
    started: Instant,
    width: f64,
    height: f64,
    monitor: tauri::Monitor,
}
struct Runtime {
    game: Mutex<Option<Game>>,
    guide: AtomicBool,
    prepared: Mutex<Option<Vec<DesktopItem>>>,
}
impl Default for Runtime {
    fn default() -> Self {
        Self {
            game: Mutex::new(None),
            guide: AtomicBool::new(true),
            prepared: Mutex::new(None),
        }
    }
}
#[derive(Serialize)]
struct Summary {
    phase: Phase,
    seconds: u64,
    total: usize,
    pocketed: usize,
}
fn summary(game: &Game) -> Summary {
    Summary {
        phase: game.table.phase,
        seconds: game.table.seconds,
        total: game.items.len(),
        pocketed: game.table.balls[1..game.table.black8]
            .iter()
            .filter(|b| b.sunk)
            .count(),
    }
}
/// Shuffle-free reservoir tail pick: seven random desktop icons per game,
/// seeded from the wall clock so every start deals a different set.
fn pick_seven(mut items: Vec<DesktopItem>) -> Vec<DesktopItem> {
    let mut seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() ^ u64::from(d.subsec_nanos()))
        .unwrap_or(0x2545_F491_4F6C_DD1D)
        | 1;
    let mut random = move || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        seed
    };
    let n = items.len();
    for i in (n - 7..n).rev() {
        let j = (random() % (u64::try_from(i).unwrap_or(0) + 1)) as usize;
        items.swap(j, i);
    }
    items.split_off(n - 7)
}
#[tauri::command]
async fn prepare_desktop(
    window: tauri::WebviewWindow,
    state: State<'_, Runtime>,
) -> Result<usize, String> {
    if window.label() != "main" {
        return Err("只能从控制面板读取桌面".into());
    }
    *state.prepared.lock().map_err(|e| e.to_string())? = None;
    let items = tauri::async_runtime::spawn_blocking(desktop::items)
        .await
        .map_err(|e| e.to_string())??;
    let count = items.len();
    *state.prepared.lock().map_err(|e| e.to_string())? = Some(items);
    Ok(count)
}
#[tauri::command]
fn open_game(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: State<Runtime>,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("只能从控制面板开始游戏".into());
    }
    let prepared = state
        .prepared
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or("请先读取桌面图标")?;
    if prepared.len() < 7 {
        return Err("桌面图标不足 7 个，无法开始游戏".into());
    }
    let items = pick_seven(prepared.clone());
    if items.iter().any(|i| {
        i.name.len() > 4096
            || i.image.len() > 8_000_000
            || (!i.image.is_empty() && !i.image.starts_with("data:image/png;base64,"))
    }) {
        return Err("桌面图标数据无效".into());
    }
    let mut guard = state.game.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Err("已有正在进行的游戏，请先结束当前游戏。".into());
    }
    let monitor = window
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("无法读取主显示器")?;
    let scale = monitor.scale_factor();
    let work = monitor.work_area();
    let width = work.size.width as f64 / scale;
    let height = work.size.height as f64 / scale;
    let x = work.position.x as f64 / scale;
    let y = work.position.y as f64 / scale;
    let now = Instant::now();
    *guard = Some(Game {
        table: Table::new(width, height, items.len()),
        pool: prepared,
        items,
        last: now,
        started: now,
        width,
        height,
        monitor,
    });
    drop(guard);
    let result = (|| -> Result<(), String> {
        let table = tauri::WebviewWindowBuilder::new(
            &app,
            "table",
            tauri::WebviewUrl::App("table.html".into()),
        )
        .title("桌面图标台球 · 台面")
        .inner_size(width, height)
        .position(x, y)
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;
        desktop::attach(&table)?;
        table.show().map_err(|e| e.to_string())?;
        // Keep the controls reachable above the desktop layer.
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        Ok(())
    })();
    if result.is_err() {
        if let Some(table) = app.get_webview_window("table") {
            let _ = table.destroy();
        }
        *state.game.lock().map_err(|e| e.to_string())? = None;
    }
    result
}
#[tauri::command]
fn initial(state: State<Runtime>) -> Result<serde_json::Value, String> {
    let guard = state.game.lock().map_err(|e| e.to_string())?;
    let game = guard.as_ref().ok_or("游戏尚未开始")?;
    let table = &game.table;
    // Static geometry travels once here so every frame only carries moving state.
    Ok(serde_json::json!({
        "items": game.items,
        "width": game.width,
        "height": game.height,
        "guide": state.guide.load(Ordering::Relaxed),
        "wallpaper": desktop::wallpaper(),
        "bounds": table.bounds,
        "pockets": table.pockets,
        "pocket_radius": table.pocket_radius,
        "rail_depth": table.rail_depth,
        "max_pull": table.max_pull,
        "radius": table.balls[0].radius,
        "black8": table.black8,
    }))
}
#[derive(serde::Deserialize)]
struct Pointer {
    x: f64,
    y: f64,
    press: Option<[f64; 2]>,
    move_aim: bool,
    turn: f64,
    shot: Option<f64>,
    release: bool,
    place: bool,
    cancel: bool,
}
#[tauri::command]
fn frame(
    window: tauri::WebviewWindow,
    state: State<Runtime>,
    pointer: Pointer,
) -> Result<physics::Snapshot, String> {
    if window.label() != "table" {
        return Err("只有台面可以推进游戏".into());
    }
    if !pointer.x.is_finite()
        || !pointer.y.is_finite()
        || !pointer.turn.is_finite()
        || pointer
            .press
            .is_some_and(|p| p.iter().any(|v| !v.is_finite()))
        || pointer
            .shot
            .is_some_and(|p| !p.is_finite() || !(0. ..=1.).contains(&p))
    {
        return Err("无效鼠标坐标".into());
    }
    let mut guard = state.game.lock().map_err(|e| e.to_string())?;
    let game = guard.as_mut().ok_or("游戏已结束")?;
    let monitor = window
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("主显示器已断开，请退出后重开")?;
    if monitor.size() != game.monitor.size()
        || monitor.position() != game.monitor.position()
        || monitor.work_area().position != game.monitor.work_area().position
        || monitor.work_area().size != game.monitor.work_area().size
        || monitor.scale_factor() != game.monitor.scale_factor()
    {
        return Err("显示器配置或 DPI 已改变，请退出后重新开始。".into());
    }
    let now = Instant::now();
    let dt = now.duration_since(game.last).as_secs_f64();
    game.last = now;
    if pointer.cancel {
        game.table.cancel_pull();
    } else {
        if pointer.move_aim {
            let [x, y] = pointer.press.unwrap_or([pointer.x, pointer.y]);
            game.table.aim_at(x, y);
        }
        if pointer.place {
            game.table.place_white(pointer.x, pointer.y);
        }
        if let Some([x, y]) = pointer.press {
            game.table.begin_pull(x, y);
        }
        game.table.pull_to(pointer.x, pointer.y);
        game.table.turn(pointer.turn.clamp(-0.25, 0.25));
        if pointer.release {
            game.table.release_pull();
        }
        if let Some(power) = pointer.shot {
            if game.table.phase == Phase::Ready {
                game.table.shoot(power);
            }
        }
    }
    game.table.step(dt);
    if game.table.phase != Phase::Finished && game.table.phase != Phase::Failed {
        game.table.seconds = game.started.elapsed().as_secs();
    }
    if state.guide.load(Ordering::Relaxed) {
        game.table.update_guide();
    } else {
        game.table.guide.clear();
        game.table.ghost = None;
    }
    Ok(game.table.snapshot())
}
#[tauri::command]
fn status(state: State<Runtime>) -> Result<Option<Summary>, String> {
    Ok(state
        .game
        .lock()
        .map_err(|e| e.to_string())?
        .as_ref()
        .map(summary))
}
#[tauri::command]
fn restart(app: tauri::AppHandle, state: State<Runtime>) -> Result<(), String> {
    let mut guard = state.game.lock().map_err(|e| e.to_string())?;
    let mut restarted = false;
    if let Some(game) = guard.as_mut() {
        // Every restart deals a new random seven from the desktop pool.
        game.items = pick_seven(game.pool.clone());
        game.table = Table::new(game.width, game.height, game.items.len());
        game.started = Instant::now();
        game.last = game.started;
        restarted = true;
    }
    drop(guard);
    if restarted {
        // The table window replays the fly-in intro when it sees this event.
        app.emit("restarted", ()).map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn toggle_guide(app: tauri::AppHandle, state: State<Runtime>, enabled: bool) -> Result<(), String> {
    state.guide.store(enabled, Ordering::Relaxed);
    app.emit("guide", enabled).map_err(|e| e.to_string())
}
#[tauri::command]
fn stop_game(app: tauri::AppHandle, state: State<Runtime>) -> Result<(), String> {
    if let Some(table) = app.get_webview_window("table") {
        table.destroy().map_err(|e| e.to_string())?;
    }
    *state.game.lock().map_err(|e| e.to_string())? = None;
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_always_on_top(false);
    }
    Ok(())
}
#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        app.exit(0);
                    }
                })
                .build(),
        )
        .manage(Runtime::default())
        .setup(|app| {
            if let Err(error) = app.global_shortcut().register("Ctrl+Alt+X") {
                eprintln!("{error}: 全局退出快捷键注册失败，请使用 Esc 或退出按钮。");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                if window.label() == "main" {
                    window.app_handle().exit(0);
                } else if window.label() == "table" {
                    if let Ok(mut guard) = window.state::<Runtime>().game.lock() {
                        *guard = None;
                    }
                    if let Some(main) = window.app_handle().get_webview_window("main") {
                        let _ = main.set_always_on_top(false);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            prepare_desktop,
            open_game,
            initial,
            frame,
            status,
            restart,
            toggle_guide,
            stop_game,
            quit
        ])
        .run(tauri::generate_context!())
        .expect("无法启动桌面图标台球");
}
