use serde::Serialize;

#[derive(Serialize, serde::Deserialize)]
pub struct DesktopItem {
    pub name: String,
    pub image: String,
}
#[cfg(target_os = "macos")]
#[path = "desktop_macos.rs"]
mod platform;
#[cfg(windows)]
#[path = "desktop_windows.rs"]
mod platform;
#[cfg(any(target_os = "macos", windows))]
pub use platform::*;

fn image_file(path: &std::path::Path) -> Option<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    // Dynamic wallpapers and unavailable local assets keep the plain felt fallback.
    if std::fs::metadata(path).ok()?.len() > 32 * 1024 * 1024 {
        return None;
    }
    let bytes = std::fs::read(path).ok()?;
    let mime = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        "image/png"
    } else if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        "image/jpeg"
    } else {
        return None;
    };
    Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}
