# Feature Map

搜索入口：需求 ID（F-001 等）、功能名或 IPC 命令。路径描述当前实际代码，不把计划目录当作已实现。

| 功能 | 入口与契约 | 实现 | 自动验证 | 原生验收 |
|---|---|---|---|---|
| F-001 应用启动／构建 | `npm run dev`、`npm run build` | `src-tauri/src/main.rs`、`src-tauri/tauri.conf.json`、`build.ps1` | Cargo 编译、Clippy、构建 | 平台启动与退出 |
| F-002 / F-005 瞄准／拉杆／碰撞／入袋 | `frame`、`restart`；`frame` 返回紧凑快照（扁平球数组），静态几何在 `initial` | `src-tauri/src/physics.rs`、`frontend/table.js`、`frontend/table-renderer.js` | Rust `physics::tests`、`tests/table-input.mjs` | 后拉距离决定力度、松手触球、微调、六袋和清台 |
| F-003 桌面覆盖／恢复 | `open_game`、`stop_game`、`quit` | `src-tauri/src/desktop_macos.rs`、`desktop_windows.rs`、`main.rs` | 平台编译 | 普通窗口高于台面、小组件低于台面、退出原图标不变 |
| F-004 / F-006 桌面项目／权限／加载失败 | `prepare_desktop`（数量）、`open_game`（消费 Rust 暂存）、`initial`（图标） | `src-tauri/src/desktop.rs` 与平台实现、`frontend/main.js` | macOS 子进程超时测试、`tests/desktop-loading.mjs`、显式 `native_desktop_startup_profile` | Finder 允许／拒绝、Explorer 项目、读取失败后重试 |
| 本局统计／辅助线开关 | `status`、`toggle_guide` | `src-tauri/src/main.rs`、`frontend/main.js` | 当前无独立 IPC 契约测试 | 开关、重开后状态一致、清台停表 |

项目验证入口：[verify-desktop-billiards](.agents/skills/verify-desktop-billiards/SKILL.md)。实际运行证据见 [VALIDATION.md](VALIDATION.md)。

## 已知结构债务

目前仍按 Rust／前端运行边界分层，未完成一功能一目录。`frame` 混合多种职责；每帧 IPC 已是紧凑快照（`physics::Snapshot`，扁平 f32 球数组，静态几何随 `initial` 一次性下发），但尚无脏标记。`Phase` 与拉杆字段是并行状态，不是已经合并的状态机。这里记录真实状态，不宣称整改完成。
