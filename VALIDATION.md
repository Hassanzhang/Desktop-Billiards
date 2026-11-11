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
