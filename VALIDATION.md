# 验证记录

## T-001～T-004 · 2026-11-11 · 未发布

环境：macOS / Apple Silicon，Rust 1.99.1、Cargo 1.99.1、Node.js 25.2.1，系统 WebKit。未连接 Windows 实机。工作区没有 `.git`，未初始化仓库、创建提交或发布标签。

### 已通过

- `npm ci`：锁文件依赖可安装（首次开发安装使用 `npm install` 生成锁文件）。
- `npm test`：5 项 Rust 行为测试全部通过。覆盖碰撞传递与反弹后重新击球、白球入袋自动复位、清台停止计时、非法摆球与碰撞位置拒绝、切球双向辅助线、1/61/300 图标球阵边界。
- `npm run check`：Clippy 全目标检查通过，`-D warnings`。
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`：通过。
- `node --check frontend/main.js` 与 `node --check frontend/table.js`：通过。
- `python3 -m unittest tests.test_table -v`：原版物理基线 12 项通过；这是迁移参考检查，不能替代 Rust 版测试。
- `npm run build -- --bundles app`：最终 macOS ARM64 `.app` 构建通过，约 11.44 MiB；包内 Finder 权限说明与应用标识已检查。
- 原生 UI：成功打开控制面板，点击「窗口试玩」后，实际 Tauri / WebKit 台面正常显示，六袋、球阵、球杆、辅助线与试玩标记可见。该操作使用示例图标，无 Finder 权限。
- Impeccable 机械检测：变更前端文件结果为 `[]`。
- Windows 适配源文件通过 `x86_64-pc-windows-gnu` 类型检查：临时验证 crate `/tmp/dib-windows-check` 直接引用项目 `desktop.rs` 和实际 `desktop_windows.rs`，依赖真实 Windows / Tauri crate。修改 `SetParent` 返回值处理后再次通过。仅检查平台适配代码，不代表完整 Windows 应用构建通过。

### 阻塞与未覆盖

- 完整 Windows 交叉检查在资源生成阶段失败：`NotAttempted("x86_64-w64-mingw32-windres")`。中文说明：当前 macOS 未安装 Windows 资源编译器；未生成 Windows EXE / MSI / NSIS 包。需要在 Windows 安装 MSVC Build Tools 和 WebView2 后运行 `npm run build`。
- 后续原生 UI 输入被电脑操作工具阻止：`The user changed '…/Desktop Icon Billiards.app'. Re-query the latest state with get_app_state before sending more actions.` 中文说明：工具无法继续发送界面动作，多次刷新状态后仍未恢复；未将“点击台面蓄力击球”“重开”“结束”“Esc / 全局快捷键退出”记为操作验收通过。
- Finder 权限允许／拒绝、真实桌面图标绘制、macOS 桌面窗口层级、Spaces、多显示器与 DPI 切换、进程强制退出后的视觉恢复均待实机操作验收。试玩截图来自壁纸缓存和输入边界修正前的构建，最终构建已通过静态和物理测试，未重新完成原生操作回归。
- Windows Explorer 实际项目提取、跨进程桌面子窗口、任务栏与混合 DPI 行为仍需 Windows 实机验收。
- 未执行 macOS Intel 构建、签名、公证、DMG 制作、长期运行或性能基准；没有正式发布。

### 人工验收步骤

1. 在各目标平台启动应用，先测试窗口试玩：按住左键蓄力、松手击球，检查碰撞、反弹、辅助线开关、重开和计时。
2. 开始桌面游戏，macOS 允许 Finder 自动化；另验拒绝权限时错误可见，重试或窗口试玩可用。
3. 核对真实图标与文件名，确认普通应用位于台面上方，控制面板可达；清台后查看统计并重开。
4. 检查白球入袋复位、结束本局、Esc、Ctrl+Alt+X、关闭主窗口；退出后核对原图标布局。
5. 重开后强制终止游戏进程，确认系统移除台面且原图标未变；调整显示器缩放或工作区，确认提示结束后重开。

## T-005 · 2026-11-11 · 桌面读取等待修复（未发布）

- 用户反馈停留在“正在读取桌面图标，请留意系统权限提示…”。代码确认 Finder `.output()` 无超时、前端等待时禁用两个启动按钮。当前进程短时 `sample` 显示已在处理游戏帧，未复现原始挂起，不能认定已确认现场根因。
- `npm test`：6 项 Rust 测试与 Node 加载流程回归通过。新增覆盖双管道大输出、非零退出、子进程超时回收和再次调用；前端覆盖拒绝权限原始错误、45 秒超时解锁、忽略迟到结果、超时后试玩。测试使用模拟 IPC，不代表 Finder 实机授权通过。
- `npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check`、`node --check frontend/main.js`：通过。
- 原生操作工具无法按进程名称识别当前 `npm run dev` 的未打包窗口；未修改系统权限，也未完成真实授权允许／拒绝与超时界面的原生回归。需重启开发应用后检查实际权限弹窗。AppKit 提取如发生原生阻塞，前端能恢复操作，但后台提取线程不能由此次保护取消。
- 当前目录无 Git 仓库，未创建提交；未发布。


## T-007 · 2026-11-11 · macOS 小组件遮挡修复（未发布）

- 用户截图显示天气、日历小组件盖在台面左上角。原实现只高于 Finder 图标（`-2147483602`），无法覆盖更高的桌面内容；本次改为 `NSNormalWindowLevel - 1`，高于桌面层且低于普通应用窗口。不修改系统小组件设置，保留 Spaces 行为。
- `npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check` 与 `npm run build -- --bundles app` 通过；macOS ARM64 包已更新，约 11.45 MiB。
- `npm test`：6 项 Rust 测试中 5 项通过；`physics::tests::crowded_rack_stays_inside_and_guide_reflects` 在 `physics.rs` 的球阵边界断言失败。本次仅修改 macOS 窗口层级，未修改该物理实现或测试；保留正在进行的 T-006 改造，不将完整回归记为通过。Node 加载回归随后单独执行。
- 原生操作工具 `cua.getState()` 返回 `js execution timed out; kernel reset, rerun your request`（界面连接超时），未完成小组件可见环境的视觉验收。CoreGraphics 当前会话未返回可用窗口列表，因此未据此推断小组件的实际层级。
- 待实机确认：重启新应用，开始真实桌面模式，天气／日历不覆盖台面；切换普通应用仍可遮住台面；退出后桌面小组件正常显示。无需关闭或修改 macOS 小组件设置。
- 工作区仍非 Git 仓库，未创建提交或发布标签。


## T-008 / T-009 · 2026-11-11 · 体积清理与审查基线

- 将原 macOS `.app` 复制至 `dist/Desktop Icon Billiards.app`，逐文件 SHA-256 与原包一致后执行 `cargo clean`：移除 13985 个文件、5.4 GiB。删除可由 `npm ci` 重装的 Node 依赖后目录约 14 MB；随后按用户要求初始化 Git，基线为 `db053ad`。并行工作流随后重新构建，`target` 又增长至约 1.1 GB；未打断或清理其他正在进行的构建。
- Cargo profile 已设为开发／测试 `debug=0`、`incremental=false`；发布 `strip="symbols"`。`cargo metadata --no-deps --locked` 通过，未为检查这些配置重新生成完整应用缓存。不宣称未来编译目录永远保持几 MB。
- `node tests/desktop-loading.mjs`、`node tests/table-input.mjs` 通过。验证 skill 经 `uv run --no-project --with pyyaml python .../quick_validate.py .agents/skills/verify-desktop-billiards` 检查通过。首次直接运行因 `ModuleNotFoundError: No module named 'yaml'`（缺少验证器依赖）失败，改用隔离工具环境，不为产品添加 Python 依赖。
- 独立微基准直接引用当时实际 `physics.rs`，Rust 1.99.1、macOS ARM64、未优化且无调试符号，每场景 500 样本，1600×1000 模拟台面。测量范围仅为静止态 `update_guide` 加 `serde_json::to_vec(Table)`，不含 IPC、显示器查询、锁或 Canvas：

| 模拟图标数 | 中位数 ms | p95 ms | JSON 字节数 |
|---|---:|---:|---:|
| 15 | 0.1023 | 0.1655 | 2431 |
| 60 | 0.1373 | 0.1645 | 5560 |
| 300 | 0.5262 | 0.5499 | 32630 |

- 同一个独立 crate 重跑实际物理模块的 7 项 Rust 行为测试，全部通过，球阵边界失败未再复现。此检查不是完整 Tauri 应用回归，不代表并行编辑后的最终构建已验收。临时微基准与编译缓存随后移除，保留本记录中的实际结果。
- 此时检测到渲染器、物理、输入测试、图片资源和 package scripts 持续发生非本轮编辑；未移动这些文件、删除旧产品或覆盖其改动。Feature Map 记录当前结构缺项，未将目录整改、领域状态收拢或性能优化标为完成。

## T-006、T-011 · 2026-11-11 · 拉杆与指定边框（未发布）

- `npm test`：8 项 Rust 测试及 3 个 Node 回归脚本通过。新增覆盖按距离蓄力、瞄准锁定、轻击／零后拉、前送触球／收势、六袋可达与斜角反弹；快速按下松手、失焦取消、方向微调、备用击球、摆白球；1280×800 与 1920×1080 下六个素材袋口锚点与等比映射。
- `npm run check`、Cargo 格式检查、前端 JS 语法检查和 `git diff --check` 通过。机械设计检测返回 `[]`（检查当时的拉杆／台面版本；此后壁纸与指定图片边框为用户追加修改）。
- `npm run build -- --bundles app`：macOS ARM64 最新素材版 `.app` 构建通过，约 9.51 MiB。并行任务清理过 Node 依赖，首次重建报 `sh: tauri: command not found`；执行 `npm ci` 后构建通过。
- 图片验证：1536×1024 RGBA；台面中心及图外角 alpha 为 0，六个网兜中心 alpha 为 253。PNG 提示词元数据扫描为 1 项素材、0 项缺失。原始用户图片未改写。
- 原生证据（改壁纸／素材前）：CUA 读取 51 个真实图标，观察到 1/51 入袋、侧栏力度及幽灵球；用户后续截图显示 4/51 入袋、圆球、木库、送杆与计时。独立复核识别出按下重置微调和触球可见帧问题，已修正并加入回归。
- 最新皮肤原生预览失败原文：`The Mac is locked and automatic unlock could not unlock it.` 中文说明：Mac 已锁屏，工具无法打开应用继续验收。最新壁纸、素材接缝与进球视觉对齐尚未原生复验，复核状态为 `recapture`，不能记为整体视觉通过。Windows、球体旋转、加塞、八球分边和新犯规未包含在本轮验收中；音效按用户要求取消。
- 本地 Git 已存在（并行任务创建基线 `db053ad`），本轮在该仓库提交源码、素材、测试和相关文档；未发布版本。

## T-012 · 2026-11-11 · 仅桌面游戏与启动读取优化

- 复现：使用原 JXA `desktop.items().map(item => ({ name: item.name(), url: item.url() }))` 对当前 51 项桌面执行名称／URL 枚举，20 秒仍未完成，测量进程超时终止。改成 `items.name()`、`items.url()` 两次批量查询，一次枚举样本为 3.795 秒。两者均为桌面枚举，不含窗口创建。
- 完整新读取实机探针：`cargo test --manifest-path src-tauri/Cargo.toml native_desktop_startup_profile -- --ignored --nocapture` 通过；`desktop_read_ms=1034 count=51 png_base64_bytes=313982`。该单次测量包含 Finder 批量查询及 51 个 AppKit PNG 编码，不包含 Tauri 创建窗口、壁纸读取或前端图片解码，不能据此宣称端到端启动仅需 1 秒。探针逐图检查 PNG IHDR 的宽高均为 64。
- `npm test`：8 项 Rust 自动测试通过，依赖真实系统的探针默认 ignored；3 个 Node 脚本通过。桌面加载回归已改为“权限失败、超时解锁、迟到结果不误开台面、桌面重试成功”，且禁止访问已移除的 demo 控件。
- `npm run check`、Cargo 格式检查、前端 JS 语法检查、`git diff --check` 通过；`npm run build -- --bundles app` 最新 macOS ARM64 `.app` 构建通过，约 9.51 MiB。
- 原生 UI：最新控制面板 AX 只有“开始桌面游戏”和“退出”，没有试玩入口。点击开始后短时显示读取反馈，后续确认真实桌面台面、51 图标及 3/51 入袋状态。CUA 首次连接报 `Computer Use server error -10005: timeoutReached`，按完整路径重连后验证成功。工具的重连、取状态等待时间不计作启动性能测量；未记录精确端到端启动耗时。
- macOS 图标读取与真实入口已验证；首次未授权、拒绝授权及 Windows Explorer 启动性能仍待目标环境复验。没有增加缓存失效策略或后台预读授权行为。

## 帧率与手感优化 · 2026-11-11 · 未发布

用户反馈诉求：游玩卡顿、击球手感、项目体积与运行速度。改动：`frame` 返回 `physics::Snapshot`（扁平 f32 球数组 + `pocketed`），静态几何（bounds/pockets/pocket_radius/rail_depth/max_pull/球半径）随 `initial` 一次性下发，消除 `serde_json::to_value` 的双重序列化；碰撞由 O(n²) 成对检查改为空间哈希邻居桶；关闭辅助线时跳过 `update_guide`；渲染器将每球阴影／图标／光泽预烘焙为 sprite，并以整层缓存只在球移动时重绘；release profile 增加 `lto="thin"`、`codegen-units=1`。

- `npm test`：8 项 Rust 测试与 3 个 Node 回归（桌面加载、输入手势、袋口锚点）全部通过；`npm run check`（Clippy `-D warnings`）与 `cargo fmt --check` 通过。
- 同机对照实测（Apple Silicon、release 构建、1600×1000 模拟台面；临时基准 crate 直接引用改动前后真实 `physics.rs`，旧版取自 Git 基线，各场景中位数）：
  - 瞄准帧（update_guide + 序列化）：300 图标 0.066→0.020 ms，JSON 32503→8056 字节；2000 图标 0.489→0.155 ms，210326→51079 字节（约 4 倍减小；旧 `frame` 的 `to_value` 双重序列化未计入旧值，实际旧开销更高）。
  - 满力击球单帧 `step`：1000 图标 9.0→3.3 ms；2000 图标 23.5→4.9 ms（旧值超过 16.7 ms 帧预算，即击球瞬间掉帧的实测根因）。
- 未覆盖：渲染器 sprite／球层缓存仅静态检查与模拟 IPC 验证，未在真实桌面窗口做原生视觉回归；命中悬停文件名的像素级外观未复验；未测真实 Finder 桌面帧率；Windows 与多显示器 DPI 行为沿用既有未验收项。
- 本轮改动在并行工作流提交 `perf(T-012)` 之后单独提交，不混入他人改动；未发布。
- 追加交付：`npm run build -- --bundles dmg` 生成 `Desktop Icon Billiards_0.1.1_aarch64.dmg`（约 4.5 MiB，`hdiutil verify` 校验通过），已复制至 `dist/`；`.app` 从同一 DMG 提取，与包内二进制一致，启动冒烟通过。dmg 打包脚本会清理 `target` 内的 macos bundle，交付 `.app` 需从 DMG 提取或重新 `--bundles app`。
