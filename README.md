# 桌面图标台球 · Desktop Icon Billiards

使用真实桌面文件图标玩台球。当前开发版本采用 **Rust + Tauri 2**，提供 Windows Explorer 与 macOS Finder 适配，共用 Rust 物理引擎和 Canvas 界面。

> 当前迁移尚未发布。macOS 已构建并打开试玩台面；完整验收范围与平台限制见 [VALIDATION.md](VALIDATION.md)。原 Python 版本源码仍保留作迁移对照，不参与新应用构建。

## 开发运行

安装 [Rust](https://rustup.rs/)、Node.js LTS，并准备 Tauri 平台依赖：

- **Windows 10/11 x64**：Visual Studio Build Tools（Desktop development with C++、Windows SDK）和 Microsoft Edge WebView2。
- **macOS**：Xcode Command Line Tools（`xcode-select --install`）。首次读取桌面时，在系统提示中允许本应用控制 Finder；拒绝后可在「系统设置 → 隐私与安全性 → 自动化」调整。使用 `npm run dev` 时，权限可能归属启动应用的终端，请检查该终端下的 Finder 开关。Finder 查询等待最多 30 秒，图标准备等待最多 45 秒；超时后可重试或选择窗口试玩。

```sh
npm ci
npm run dev
```

Windows 也可以双击 `run.cmd`。游戏不再需要 Python、Tk 或 PyInstaller。

## 玩法

1. 点击「开始桌面游戏」读取真实桌面图标；点击「窗口试玩」使用明确标注的示例图标，不申请 Finder 权限。
2. 在台面移动鼠标瞄准，按住左键向后拉杆，松手击球。辅助线显示首次碰撞及白球／目标球的后续方向。
3. 六个袋口均可进球；白球入袋后自动尝试复位，无法复位时点击空处摆球。清台后计时停止。
4. 用控制面板切换辅助线、重新开始或结束本局。按 `Esc`、全局快捷键 `Ctrl+Alt+X` 或点击「退出」关闭应用。

台面覆盖主显示器工作区，位于普通应用窗口下方。原始桌面图标不移动、不隐藏、不更改排列设置，关闭应用或进程异常退出后，系统移除游戏窗口，原桌面仍在。分辨率、缩放或工作区变化后需结束本局并重开。多显示器下汇集桌面项目，在主显示器游戏。

## 构建和检查

在对应平台构建：

```sh
npm run build
npm test
npm run check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Windows 也可以运行 `pwsh -File build.ps1`；依赖已装好时加 `-SkipDeps`。

- macOS 包：`src-tauri/target/release/bundle/macos/Desktop Icon Billiards.app`，默认当前架构。只构建 `.app`：`npm run build -- --bundles app`。
- Windows 包：`src-tauri/target/release/bundle/` 内的 MSI / NSIS 安装包；需要 Windows 原生构建工具。与旧版 PyInstaller 单文件 EXE 的分发方式不同。
- 正式 macOS 分发需签名、公证；当前本地构建不代表已签名发布。Apple Events entitlement 与权限说明已配置。

## 代码与迁移范围

- [PRODUCT.md](PRODUCT.md)：迁移需求与边界。
- [DEVELOPMENT.md](DEVELOPMENT.md)：Rust 模块、平台适配和与旧版的差异。
- [TASKS.md](TASKS.md)：任务和验收状态。
- [VALIDATION.md](VALIDATION.md)：实际验证证据。

原 `app.pyw`、`dib/`、Python 依赖、测试及 `build-python-legacy.ps1` 仅用于旧版对照。旧版下载可在 [上游发布页](https://github.com/liuxiaogang-com/desktop-icon-billiards/releases) 查找；旧 `update.json` 和 [docs/UPDATE.md](docs/UPDATE.md) 仍属于 Python Windows EXE，不是 Rust 版更新源。

当前应用不截屏、不采集音频、不主动请求网络；只读取桌面项目名并通过系统接口提取图标。没有自动更新下载行为。

## 许可证

[MIT](LICENSE) · Copyright (c) 2025–2026 LXG
