use super::DesktopItem;
use base64::{engine::general_purpose::STANDARD, Engine};
use windows::{
    core::{w, Interface},
    Win32::{
        Foundation::*,
        Graphics::Gdi::*,
        System::{Com::*, Variant::VARIANT},
        UI::{Shell::*, WindowsAndMessaging::*},
    },
};

pub fn items() -> Result<Vec<DesktopItem>, String> {
    unsafe {
        read_items()
            .map_err(|e| format!("{e}\n无法读取 Explorer 桌面，请在普通桌面会话运行并重试。"))
    }
}
unsafe fn read_items() -> windows::core::Result<Vec<DesktopItem>> {
    // Each invocation runs on its own blocking thread with a balanced COM apartment.
    CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok()?;
    struct Apartment;
    impl Drop for Apartment {
        fn drop(&mut self) {
            unsafe { CoUninitialize() }
        }
    }
    let _apartment = Apartment;
    let shell: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_ALL)?;
    let empty = VARIANT::default();
    let mut hwnd = 0;
    let dispatch = shell.FindWindowSW(&empty, &empty, SWC_DESKTOP, &mut hwnd, SWFO_NEEDDISPATCH)?;
    let provider: IServiceProvider = dispatch.cast()?;
    let browser: IShellBrowser = provider.QueryService(&SID_STopLevelBrowser)?;
    let view: IFolderView = browser.QueryActiveShellView()?.cast()?;
    let array: IShellItemArray = view.Items(SVGIO_ALLVIEW)?;
    let mut result = Vec::new();
    for i in 0..array.GetCount()? {
        let item = array.GetItemAt(i)?;
        let name_ptr = item.GetDisplayName(SIGDN_NORMALDISPLAY)?;
        let name = name_ptr.to_string();
        CoTaskMemFree(Some(name_ptr.0.cast()));
        let name = name?;
        let factory: IShellItemImageFactory = item.cast()?;
        let bitmap = factory.GetImage(SIZE { cx: 64, cy: 64 }, SIIGBF_BIGGERSIZEOK)?;
        let image = bitmap_png(bitmap);
        let _ = DeleteObject(HGDIOBJ(bitmap.0));
        let image = image?;
        result.push(DesktopItem {
            name,
            image: format!("data:image/png;base64,{}", STANDARD.encode(image)),
        });
    }
    if result.is_empty() {
        return Err(windows::core::Error::new(
            windows::core::HRESULT(0x80004005u32 as i32),
            "桌面没有图标",
        ));
    }
    Ok(result)
}
unsafe fn bitmap_png(bitmap: HBITMAP) -> windows::core::Result<Vec<u8>> {
    let mut object = BITMAP::default();
    if GetObjectW(
        HGDIOBJ(bitmap.0),
        std::mem::size_of::<BITMAP>() as i32,
        Some((&mut object as *mut BITMAP).cast()),
    ) == 0
    {
        return Err(windows::core::Error::from_thread());
    }
    let width = object.bmWidth as u32;
    let height = object.bmHeight.unsigned_abs();
    let mut info = BITMAPINFO::default();
    info.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: width as i32,
        biHeight: -(height as i32),
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    let dc = GetDC(None);
    let mut pixels = vec![0u8; (width * height * 4) as usize];
    let lines = GetDIBits(
        dc,
        bitmap,
        0,
        height,
        Some(pixels.as_mut_ptr().cast()),
        &mut info,
        DIB_RGB_COLORS,
    );
    ReleaseDC(None, dc);
    if lines != height as i32 {
        return Err(windows::core::Error::from_thread());
    }
    let no_alpha = pixels.chunks_exact(4).all(|p| p[3] == 0);
    for p in pixels.chunks_exact_mut(4) {
        p.swap(0, 2);
        if no_alpha {
            p[3] = 255;
        } else if p[3] > 0 && p[3] < 255 {
            for channel in 0..3 {
                p[channel] = ((p[channel] as u32 * 255) / p[3] as u32).min(255) as u8;
            }
        }
    }
    let mut data = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut data, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|e| {
            windows::core::Error::new(windows::core::HRESULT(0x80004005u32 as i32), e.to_string())
        })?;
        writer.write_image_data(&pixels).map_err(|e| {
            windows::core::Error::new(windows::core::HRESULT(0x80004005u32 as i32), e.to_string())
        })?;
    }
    Ok(data)
}
unsafe extern "system" fn find_desktop(hwnd: HWND, param: LPARAM) -> windows::core::BOOL {
    if let Ok(view) = FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), None) {
        *(param.0 as *mut HWND) = view;
        return false.into();
    }
    true.into()
}
pub fn attach(window: &tauri::WebviewWindow) -> Result<(), String> {
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let mut parent = HWND::default();
        let _ = EnumWindows(
            Some(find_desktop),
            LPARAM((&mut parent as *mut HWND) as isize),
        );
        if parent.is_invalid() {
            return Err("找不到 Explorer 桌面窗口".into());
        }
        let position = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.inner_size().map_err(|e| e.to_string())?;
        let mut point = POINT {
            x: position.x,
            y: position.y,
        };
        let _ = ScreenToClient(parent, &mut point);
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        SetWindowLongPtrW(
            hwnd,
            GWL_STYLE,
            ((style & !WS_POPUP.0) | WS_CHILD.0) as isize,
        );
        // A previously parentless top-level window yields NULL on success too.
        SetLastError(ERROR_SUCCESS);
        if let Err(error) = SetParent(hwnd, Some(parent)) {
            if GetLastError() != ERROR_SUCCESS {
                return Err(error.to_string());
            }
        }
        SetWindowPos(
            hwnd,
            Some(HWND_TOP),
            point.x,
            point.y,
            size.width as i32,
            size.height as i32,
            SWP_FRAMECHANGED | SWP_NOACTIVATE,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn wallpaper() -> Option<String> {
    let mut path = [0u16; 32768];
    unsafe {
        SystemParametersInfoW(
            SPI_GETDESKWALLPAPER,
            path.len() as u32,
            Some(path.as_mut_ptr().cast()),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        )
        .ok()?;
    }
    let length = path.iter().position(|&c| c == 0)?;
    super::image_file(std::path::Path::new(&String::from_utf16_lossy(
        &path[..length],
    )))
}
