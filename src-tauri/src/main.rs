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
    time::Instant,
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct Game {
    table: Table,
    items: Vec<DesktopItem>,
    last: Instant,
    started: Instant,
    width: f64,
    height: f64,
    monitor: tauri::Monitor,
    demo: bool,
}
struct Runtime {
    game: Mutex<Option<Game>>,
    guide: AtomicBool,
}
impl Default for Runtime {
    fn default() -> Self {
        Self {
            game: Mutex::new(None),
            guide: AtomicBool::new(true),
        }
    }
}
#[derive(Serialize)]
struct Summary {
    phase: Phase,
    seconds: u64,
    total: usize,
    pocketed: usize,
    demo: bool,
}
fn summary(game: &Game) -> Summary {
    Summary {
        phase: game.table.phase,
        seconds: game.table.seconds,
        total: game.items.len(),
        pocketed: game.table.balls.iter().skip(1).filter(|b| b.sunk).count(),
        demo: game.demo,
    }
}
#[tauri::command]
async fn prepare_desktop(demo: bool) -> Result<Vec<DesktopItem>, String> {
    if demo {
        return Ok((1..=15)
            .map(|i| DesktopItem {
                name: format!("试玩图标 {i}"),
                image: String::new(),
            })
            .collect());
    }
    tauri::async_runtime::spawn_blocking(desktop::items)
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
fn open_game(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: State<Runtime>,
    items: Vec<DesktopItem>,
    demo: bool,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("只能从控制面板开始游戏".into());
    }
    if items.is_empty()
        || items.len() > 2000
        || items.iter().any(|i| {
            i.name.len() > 4096
                || i.image.len() > 8_000_000
                || (!i.image.is_empty() && !i.image.starts_with("data:image/png;base64,"))
        })
    {
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
        items,
        last: now,
        started: now,
        width,
        height,
        monitor,
        demo,
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
        .decorations(demo)
        .resizable(false)
        .skip_taskbar(!demo)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;
        if !demo {
            desktop::attach(&table)?;
        }
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
    Ok(
        serde_json::json!({"items":game.items,"width":game.width,"height":game.height,"demo":game.demo,"guide":state.guide.load(Ordering::Relaxed),"wallpaper":if game.demo {None} else {desktop::wallpaper()}}),
    )
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
) -> Result<serde_json::Value, String> {
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
            if !game.table.pulling {
                game.table.shoot(power);
            }
        }
    }
    game.table.step(dt);
    if game.table.phase != Phase::Finished {
        game.table.seconds = game.started.elapsed().as_secs();
    }
    game.table.update_guide();
    serde_json::to_value(&game.table).map_err(|e| e.to_string())
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
fn restart(state: State<Runtime>) -> Result<(), String> {
    let mut guard = state.game.lock().map_err(|e| e.to_string())?;
    if let Some(game) = guard.as_mut() {
        game.table = Table::new(game.width, game.height, game.items.len());
        game.started = Instant::now();
        game.last = game.started;
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
