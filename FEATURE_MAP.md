# Feature Map

搜索入口：需求 ID（F-001 等）、功能名或 IPC 命令。路径描述当前实际代码，不把计划目录当作已实现。

| 功能 | 入口与契约 | 实现 | 自动验证 | 原生验收 |
|---|---|---|---|---|
| F-001 应用启动／构建 | `npm run dev`、`npm run build` | `src-tauri/src/main.rs`、`src-tauri/tauri.conf.json`、`build.ps1` | Cargo 编译、Clippy、构建 | 平台启动与退出 |
| F-002 / F-005 瞄准／拉杆／碰撞／入袋 | `frame`、`restart`（广播 `restarted` 事件）；`frame` 返回紧凑快照（`Phase::Pull` 合并拉杆，快照无并行拉杆字段），静态几何与 `black8` 索引在 `initial`；前端空闲时跳过 `frame`，约 0.9s 唤醒刷新计时 | `src-tauri/src/physics.rs`、`frontend/table.js`、`frontend/table-renderer.js`（开场飞入、入袋粒子、拉杆力度弧在渲染层；`restart` 事件在 `main.rs`） | Rust `physics::tests`（含 `pull_is_a_phase`、`black_eight_must_be_pocketed_last`、`scratch_pauses_then_hands_ball_to_player`）、`tests/table-input.mjs`（含空闲帧不重复发帧） | 后拉距离决定力度、松手触球、微调、六袋和清台；白球入袋由玩家点击空处摆球（不自动摆回）；黑 8 须最后入袋，提前落袋判负；动效与空闲功耗收益待原生帧剖面（T-009） |
| F-002 随机发球 | `open_game`（不足 7 个图标拒绝）、`restart`（重新抽 7） | `src-tauri/src/main.rs`（`pick_seven`：时钟种子 xorshift，池存于 `Game.pool`）、`frontend/table.js`（`restarted` 后重拉 `initial` 与图标） | Rust 编译；`tests/desktop-loading.mjs` 覆盖加载契约 | 每局发球集合不同、重开动画重放待原生验收 |
| F-003 桌面覆盖／恢复 | `open_game`、`stop_game`、`quit` | `src-tauri/src/desktop_macos.rs`、`desktop_windows.rs`、`main.rs` | 平台编译 | 普通窗口高于台面、小组件低于台面、退出原图标不变 |
| F-004 / F-006 桌面项目／权限／加载失败 | `prepare_desktop`（数量）、`open_game`（消费 Rust 暂存）、`initial`（图标） | `src-tauri/src/desktop.rs` 与平台实现、`frontend/main.js` | macOS 子进程超时测试、`tests/desktop-loading.mjs`、显式 `native_desktop_startup_profile` | Finder 允许／拒绝、Explorer 项目、读取失败后重试 |
| 本局统计／辅助线开关 | `status`、`toggle_guide` | `src-tauri/src/main.rs`、`frontend/main.js` | 当前无独立 IPC 契约测试 | 开关、重开后状态一致、清台停表 |

项目验证入口：[verify-desktop-billiards](.agents/skills/verify-desktop-billiards/SKILL.md)。实际运行证据见 [VALIDATION.md](VALIDATION.md)。

## 已知结构债务

目前仍按 Rust／前端运行边界分层，未完成一功能一目录。`frame` 混合多种职责；每帧 IPC 已是紧凑快照（`physics::Snapshot`，扁平 f32 球数组，静态几何随 `initial` 一次性下发），前端帧循环在无输入、无动画且静止时跳过 `frame` 调用（脏标记在前端侧，约 0.9 秒唤醒刷新计时），Rust 侧命令仍每调用全量推进。`Phase` 已合并拉杆状态（独立 `pull` 阶段，快照无并行拉杆字段）。这里记录真实状态，不宣称整改完成。
