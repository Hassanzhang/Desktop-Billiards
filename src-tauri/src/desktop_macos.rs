use super::DesktopItem;
use base64::{engine::general_purpose::STANDARD, Engine};
use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSBitmapImageFileType, NSBitmapImageRep, NSNormalWindowLevel, NSWindow,
    NSWindowCollectionBehavior, NSWorkspace,
};
use objc2_foundation::{NSDictionary, NSString};
use std::{
    io::Read,
    process::{Command, Output, Stdio},
    time::{Duration, Instant},
};

// Drain both pipes while waiting: a large desktop listing can exceed pipe capacity.
fn timed_output(command: &mut Command, timeout: Duration) -> Result<Output, String> {
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let mut stdout = child.stdout.take().ok_or("无法读取 Finder 输出")?;
    let mut stderr = child.stderr.take().ok_or("无法读取 Finder 错误")?;
    std::thread::scope(|scope| {
        let out = scope.spawn(move || {
            let mut bytes = Vec::new();
            stdout.read_to_end(&mut bytes).map(|_| bytes)
        });
        let err = scope.spawn(move || {
            let mut bytes = Vec::new();
            stderr.read_to_end(&mut bytes).map(|_| bytes)
        });
        let started = Instant::now();
        let status = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status,
                Ok(None) if started.elapsed() < timeout => {
                    std::thread::sleep(Duration::from_millis(20))
                }
                result => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(match result {
                        Err(e) => e.to_string(),
                        _ => "读取 Finder 桌面超时（30 秒）。请检查是否有待处理的系统权限弹窗；在系统设置 → 隐私与安全性 → 自动化中检查启动本应用的终端或本应用是否获准控制 Finder，然后重试，也可选择窗口试玩。".into(),
                    });
                }
            }
        };
        Ok(Output {
            status,
            stdout: out
                .join()
                .map_err(|_| "读取 Finder 输出失败")?
                .map_err(|e| e.to_string())?,
            stderr: err
                .join()
                .map_err(|_| "读取 Finder 错误失败")?
                .map_err(|e| e.to_string())?,
        })
    })
}

pub fn items() -> Result<Vec<DesktopItem>, String> {
    // Finder automation is read-only; the desktop layout and visibility are never modified.
    let result = timed_output(
        Command::new("/usr/bin/osascript").args([
            "-l",
            "JavaScript",
            "-e",
            r#"
const finder = Application('Finder');
JSON.stringify(finder.desktop.items().map(item => ({ name: item.name(), url: item.url() })));
"#,
        ]),
        Duration::from_secs(30),
    )?;
    if !result.status.success() {
        return Err(format!("{}\n无法读取 Finder 桌面；请在系统设置 → 隐私与安全性 → 自动化中允许本应用控制 Finder，然后重试。",String::from_utf8_lossy(&result.stderr).trim()));
    }
    #[derive(serde::Deserialize)]
    struct Item {
        name: String,
        url: String,
    }
    let rows: Vec<Item> = serde_json::from_slice(&result.stdout).map_err(|e| e.to_string())?;
    let workspace = NSWorkspace::sharedWorkspace();
    let mut icons = Vec::new();
    for row in rows {
        let path = tauri::Url::parse(&row.url)
            .map_err(|e| e.to_string())?
            .to_file_path()
            .map_err(|_| "Finder 返回了无效文件路径")?;
        let image = workspace.iconForFile(&NSString::from_str(&path.to_string_lossy()));
        let tiff = image.TIFFRepresentation().ok_or("无法读取桌面图标")?;
        let rep = NSBitmapImageRep::imageRepWithData(&tiff).ok_or("无法转换桌面图标")?;
        let png = unsafe {
            rep.representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
        }
        .ok_or("无法编码桌面图标")?;
        icons.push(DesktopItem {
            name: row.name,
            image: format!("data:image/png;base64,{}", STANDARD.encode(png.to_vec())),
        });
    }
    if icons.is_empty() {
        return Err("桌面没有可用图标，请先在桌面放置文件后重试。".into());
    }
    Ok(icons)
}

pub fn attach(window: &tauri::WebviewWindow) -> Result<(), String> {
    let ptr = window.ns_window().map_err(|e| e.to_string())?;
    let _mtm = MainThreadMarker::new().ok_or("桌面窗口必须在主线程创建")?;
    let native = unsafe { &*(ptr as *const NSWindow) };
    // Desktop widgets can sit above Finder icons. Cover all desktop content while
    // keeping ordinary application windows (NSNormalWindowLevel) above the game.
    native.setLevel(NSNormalWindowLevel - 1);
    native.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    Ok(())
}

pub fn wallpaper() -> Option<String> {
    use objc2_app_kit::NSScreen;
    let screen = NSScreen::mainScreen(MainThreadMarker::new()?)?;
    let url = NSWorkspace::sharedWorkspace().desktopImageURLForScreen(&screen)?;
    let path = url.path()?.to_string();
    super::image_file(std::path::Path::new(&path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finder_process_output_and_timeout() {
        // Both pipes exceed typical pipe capacity; waiting before draining would hang.
        let output = timed_output(
            Command::new("/bin/sh").args([
                "-c",
                "head -c 131072 /dev/zero; head -c 131072 /dev/zero >&2; exit 7",
            ]),
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(output.status.code(), Some(7));
        assert_eq!(output.stdout.len(), 131072);
        assert_eq!(output.stderr.len(), 131072);
        let started = Instant::now();
        let error = timed_output(
            Command::new("/bin/sleep").arg("10"),
            Duration::from_millis(80),
        )
        .unwrap_err();
        assert!(error.contains("超时"));
        assert!(started.elapsed() < Duration::from_secs(2));
        // A failed attempt must not prevent a subsequent request.
        assert!(
            timed_output(&mut Command::new("/usr/bin/true"), Duration::from_secs(1))
                .unwrap()
                .status
                .success()
        );
    }
}
