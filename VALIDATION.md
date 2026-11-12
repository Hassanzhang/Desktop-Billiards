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

## T-014 · 2026-11-12 · 状态机合并、动效与空闲帧跳过（未发布）

- 拉杆从并行布尔并入状态机：`Phase::Pull` 独立阶段，快照移除 `pulling` 字段；拉杆中禁用侧栏击球、摆白球与微调，取消回 ready，松手进 stroke。`restart` 现广播 `restarted` 事件供台面重放开场动画。
- 台面动效（前端渲染层）：开局／重开图标飞入（散点起点、`i%7` 交错 0.06s、单球 0.8s、sin² 侧偏弧线）；入袋缩小幽灵加 9 点薄荷粒子环（0.55s，按球半径缩放）；拉杆力度弧（radius+7、3px、charge 决定弧长，颜色薄荷→琥珀→炭红）。击球按钮补 hover／active 变体并把 disabled 指针从 wait 改为 default。
- 空闲帧跳过：前端帧循环在无一次性输入、无拉杆／滚动／返回动画、无飞入／入袋特效时不调用 `frame`，约 0.9s 唤醒一次仅刷新计时。一次性输入仍逐帧送达，测试覆盖空闲不重复发帧与手势合并。
- `npm test`：10 项 Rust 测试（含新增 `pull_is_a_phase`）与 3 个 Node 回归通过；`npm run check`（Clippy `-D warnings`）、`cargo fmt --check`、`node --check` 三个前端文件通过。
- 未覆盖：飞入动画、粒子、力度弧为模拟验证（vm 桩渲染器），未做原生视觉回归；空闲功耗收益未在用户桌面实测帧率或能耗（按 T-009 边界）；拉杆手势、取消、重开动画的真实窗口操作待原生验收。测试模拟中阶段变更发生在两次帧之间，需一次输入帧让 `lastTable` 跟上后摆球手势才生效；真实会话中阶段变化发生在连续帧流内，不存在该窗口。

## 白球摆球交互修正 · 2026-11-12 · 未发布

- 用户要求白球入袋后不自动摆回。`step` 的 ReturnWhite 分支移除 fallback 自动摆位循环，0.8s 停顿后仅进入 `BallInHand`，白球保持沉袋直至玩家点击台面空处（`place_white` 校验不变）。前端两阶段提示统一为“点击台面空处摆球”，README 与 DESIGN.md 同步。
- `npm test`：10 项 Rust 测试通过（原 `scratch_returns_and_finished_clock_freezes` 改为 `scratch_pauses_then_hands_ball_to_player`，断言停顿后停在 BallInHand、白球仍沉袋、需真实点击才复位）；Node 三项回归、`npm run check`、`cargo fmt --check` 通过。
- 未覆盖：等待→摆球的实际点击体验待原生验收（沿用 T-014 边界）。

## T-015 · 2026-11-12 · 黑八规则与随机发球（未发布）

- 用户规则：每局从桌面随机抽 7 个图标作为目标球，黑 8 固定在球阵最深列中央；先清完 7 个图标球，最后打进黑 8 获胜；黑 8 提前落袋立即判负。实现：`open_game` 校验池 ≥7 后 `pick_seven`（时钟种子 xorshift Fisher–Yates）抽 7，池保留在 `Game.pool`，`restart` 重抽并通过 `restarted` 让台面重拉 `initial`／图标素材；`Table::new` 以 `rack = count + 1` 布阵并让黑 8 占据最深列中央（`Table.black8`）；`step` 中黑 8 落袋且图标未清完 → `Phase::Failed`（清零速度、计时冻结、拒绝新击球）；图标全清后黑 8 落袋 → `Finished`。快照/摘要的 `pocketed` 只计图标球；黑 8 前端专用渲染（黑面＋米白数字 8），文件名浮层跳过黑 8。
- `npm test`：10 项 Rust 测试（新增 `black_eight_must_be_pocketed_last`：提前落袋判负冻结、清完后落袋获胜、只剩黑八时维持 Ready）与 3 个 Node 回归通过；`npm run check`（Clippy `-D warnings`）、`cargo fmt --check`、`node --check` 三个前端文件通过。`chain_shot` 测试将黑 8 移出击球线以保持链条语义。
- 未覆盖：随机发球的视觉随机性、黑 8 渲染与失败提示、不足 7 个图标的真实桌面错误路径均待原生验收（沿用 T-014/T-009 边界）。

## T-016 · 2026-11-12 · 球杆贴图化与光照分层（未发布）

- 用户诉求：杆身不再用梯形＋斜线充木头；改用其提供的 `frontend/assets/cue.png`（2172×724、透明背景、已含枫木纹／亚麻握把／环饰／铜箍／皮革头，杆头朝图左）。实现：贴图按 `aim` 旋转绘制（长度沿用 `min(400, 台面高 × 0.48)`，等比缩放保留图内细节）；屏幕空间圆柱光用独立 cue 图层 `source-atop` 叠加，渐变轴取垂直于杆轴且朝屏幕上方的方向，亮带固定上沿不随杆旋转；布面接触影（`blur(3px)`、alpha 0.13、屏幕向下 2.5px、画于球之下）；叠放先球后杆，`destination-out` 只裁掉与白球重叠的杆头段；收势从 `-12×(1-cue_follow)` 改为 `-4×cue_follow` 短随动；stroke→rolling 瞬间触发触点闪光（半径 `radius×0.3`、alpha 0.6、130ms）。力度弧与随动参数同步进 DESIGN.md。
- `node --check` 三个前端文件、`tests/table-input.mjs`、`tests/frame-skin.mjs` 通过；Rust 无改动，物理回归沿用上轮结果。
- 未覆盖：贴图杆的实拍视觉（旋转方向、光带位置、裁切开合、闪光大小）、`ctx.filter` 在系统 WebKit 的模糊效果均需原生验收；模拟桩不渲染贴图。

## T-017 · 2026-11-12 · 球材质拆分、matcap 与 14 球发球（未发布）

- 用户反馈三个点：(1) 阴影烘焙在球精灵里，球靠近时像贴纸叠贴；(2) 需要台球 matcap 材质、图标球面压缩内切、高光固定左上；(3) 每局 7 球太少改为 14，且实机出现两个黑 8。另报 `TypeError: undefined is not an object (evaluating 'white.x')` 使球杆整根不显示。
- 修复：`cueGeom` 未返回 `white`——补上后杆图层恢复绘制。双黑 8 根因：黑 8 占据球阵中央（index 5／现在 13）后，其后的球索引未前移，`bake` 的 `images[i-1]` 映射越界落到无图回退的"数字 8 条纹球"上——新增 `ballImage` 映射（`i>black8 → images[i-2]`），悬停文件名同步改为 `hover < black8 ? hover-1 : hover-2`。
- 材质：精灵不再烘焙投影；`drawBallShadow` 在球层内画偏下（0.36r）椭圆软影（scale(1,.55)、径向渐变 alpha 0.32），开场动画同步。`drawBallFace` 重写：干净底色圆 → 图标 contain 进内切圆（0.8r）后 12 条 sin 竖条球面压缩、底色渐变熔边留球色环 → `ball-matcap.png`（透明背景、球体 504/512，`multiply` 对齐球径）→ 固定左上锐高光 + 0.2 边缘座光。白球底色 `#f6f3e8`，黑 8 `#14171a`，全部球共享同一光向。
- 发球：`pick_seven` 泛化为 `pick_icons(items, ICONS_PER_GAME=14)`，`open_game`/`restart` 同步，不足 14 个提示拒绝。Rack=15（14+黑 8），白球共 16 球。
- `npm test`（10 项 Rust + 3 项 Node）、`npm run check`、`cargo fmt --check`、`node --check` 通过。
- 未覆盖：matcap 光向观感、阴影柔和度、球面压缩强度、双黑 8 修复的实机确认均待原生验收；模拟桩不渲染贴图。

## 球杆方向与接触影修正 · 2026-11-12 · 未发布

- 用户实机反馈：杆贴图贴反（击球端显示成杆尾），且杆外围有一圈阴影状长方形。根因：(1) 绘制把贴图左缘（杆头）放到了远离母球的一端，改为 `translate(tipX) + scale(-1,1)` 镜像，旋转保留；(2) 接触影原先对贴图外接矩形整块填半透明色，贴图四周透明区被染色成矩形暗带——改为 `updateCueLayer` 先把贴图＋光照＋裁切烘焙进杆图层，接触影由图层像素经 `shadowBlur(4)/alpha 0.18/下偏 2.5px` 生成，只沿杆形。
- `node --check`、三项 Node 回归通过；Rust 无改动。杆头方向、阴影形状待原生复验。

## matcap 偏暗修复 · 2026-11-12 · 未发布

- 用户实机反馈：球身颜色太深、白球也偏黑。根因：matcap 以 `multiply` 合成——matcap 球体大面积是中灰（亮度约 0.5），乘法等价于把所有底色乘 0.5，图标球整体发暗、白球被压成灰黑。修复：改为 `overlay` 合成——其中性灰 0.5 恰好不变色，仅亮区提亮、暗区压暗，阴影与菲涅尔边保留且不偏色；白球恢复 `#f6f3e8` 底色的观感。DESIGN.md 球材质段同步改为 overlay 表述并注明"不用 multiply"。
- `node --check` ×2、三项 Node 回归、`npm test`（10 Rust）、`npm run check`、`cargo fmt --check` 通过；Rust 无改动。
- 未覆盖：overlay 后的实际亮度观感（是否还需要调 matcap 不透明度或高光强度）待原生验收。

## 冗余代码清理与 README 致谢 · 2026-11-12 · 未发布

- 全面排查残留源码：确认无"效果更好但未启用"的历史实现（手绘球杆、烘焙阴影、multiply 合成均已在替换时删除）；Rust 侧无 `#[allow(dead_code)]`，Clippy 全绿。删除三处小冗余：`draw` 前错位的重复注释、`ballColors[0]`（`'#eee9da'`，映射 `(index-1)%8+1` 从不取 0 号槽，改 8 色数组＋`(index-1)%8`）、`melt` 渐变中 `index === 0` 死分支（该路径仅在 `index > 0 && image` 时执行）；table.js "new random seven" 过时注释改为 fourteen。
- README 新增"致谢"章节，注明本项目借鉴上游仓库 https://github.com/liuxiaogang-com/desktop-icon-billiards 的玩法与设计，Rust 版为其 Python 原版的迁移重写。
- `node --check` ×2、三项 Node 回归、`npm test`（10 Rust）、`npm run check`、`cargo fmt --check` 通过；纯清理无行为改动，视觉无变化。


## T-018 · 2026-11-12 · 球杆粗细、高光与透明边缘（未发布）

- 原素材 2172×724，31,408 像素 alpha=1/255；有效杆身前段约 32px，旧绘制在 400px 高窗口仅约 2.8px 粗。现于 renderer 初始化时清理 alpha ≤8/255 并计算有效像素边界，原 PNG 不变；按有效边界映射到独立 18px 杆径，前段约 7px，保留木头、握把及金属的原有细节；附加亮带按实际杆径收窄。击球状态与长度公式不变。
- `node --check frontend/table-renderer.js`、`cargo test --manifest-path src-tauri/Cargo.toml physics::tests`（9 项）、`npm test`（10 项 Rust 通过、1 项真实 Finder 测量按既有约定忽略，3 项 Node 通过）、`npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check` 均通过。
- 浏览器：`python3 -m http.server 8765 --bind 127.0.0.1`；本机 Google Chrome headless 打开 `/tests/cue-preview.html`（`--virtual-time-budget=5000 --window-size=1000,1000 --dump-dom`，分别 DPR 1 与 `--force-device-scale-factor=2`）。400/900px 高度 × 5 个角度全部通过：前段可见粗细 ≥5px，杆外 35px 处无杂色／矩形光照，pull/stroke 绘制无异常。截图确认枫木、握把、环饰与杆头方向；使用模拟球桌状态与真实素材，不冒充原生操作验收。测试页面可重复运行，无新增项目依赖。
- Impeccable detector：无阻断项；对测试页继承文字色报一条 advisory，浏览器实测使用已设定的浅色文字，并非实际黑字。
- 未覆盖：Tauri 原生桌面窗口中的实际拉杆手势、取消、重开、跨平台与不同壁纸视觉验收；不声称已测量原生帧率或功耗。测试用本地 HTTP 服务验证后关闭。

## T-019 · 2026-11-12 · 球面材质重构与三球视觉回归（未发布）

- 用户诉求：伪 3D 球不合格（短圆柱、横向色带、厚重边框、图标平面化、光照不一致）；图标应铺满球面、有酚醛质感、不要五颜六色；黑 8 不变；先做白球／红色图标球／蓝色 Word 图标球三球截图对比，通过后再批量应用。
- 迭代过程：(1) 12 条 sin 竖条仅横向压缩 → 短圆柱感与横向色带（已删）；(2) matcap 以 multiply 叠加 → 整体压暗（此前已改 overlay）；(3) 三角网格同心方形→圆盘映射 → 高压缩区接缝波纹（红球纸形呈波浪）；(4) 全半球角包裹（cap 90°）→ 中心放大 1.57×、纹理边缘绕球缘成 S 波浪、对角拉伸花瓣边——用户反馈"图标变形太厉害"；(5) 最终：不透明包围盒 cover 裁切＋8% 过扫铺满，逐像素**轻微逐轴球面变形**（平面与角映射各半、指数 0.9，中心≈1:1、直线保持直线、边缘压缩），`ball-matcap.png` overlay 接入渲染（对齐 504/512）＋小锐镜面高光；彩色球色谱删除，图标球统一石色底 `#a89e8d`，白球 `#f7f4ea`，黑 8 设计不变。
- 视觉验收：`tests/ball-preview.html` 经无头 Chrome（`--headless=new --screenshot`，1560×600）产出三球截图：白球连续光泽；Word 球蓝色铺满、W 清晰锐利；文档球横线笔直、边缘压缩弯曲。批量应用与三球共用同一 `drawBallFace` 代码路径，无需额外工作。
- `node --check` ×2、`tests/table-input.mjs`、`tests/frame-skin.mjs`、`tests/desktop-loading.mjs`、`npm test`（10 Rust）、`npm run check`、`cargo fmt --check` 通过；Rust 无改动。
- 未覆盖：实机小尺寸（radius≈14px）下图标可辨识度、烘焙耗时（16 球逐像素映射）在真实桌面的帧影响、matcap 在原生 WebKit 的合成一致性，待原生验收。


## T-020 · 2026-11-12 · 启动面板背景与美化（未发布）

- 使用用户原图 `frontend/assets/launcher-background.png`，标题居中、辅助线按钮靠右；暖金主按钮及文字、深色半透明统计区，移除底部退出快捷键与技术版本文案。退出按钮与快捷键行为保留。
- Chrome headless + CDP，模拟 `window.__TAURI__` IPC，在 460×248 CSS px（模拟 460×280 原生窗口扣除标题栏）、DPR 2 截图复核：背景正常、无底部小字、无默认滚动条，标题不再与左上灯具重叠。启动调用、辅助线开关、运行中统计、权限失败提示均通过。
- `node tests/desktop-loading.mjs`、`node tests/table-input.mjs`、`node tests/frame-skin.mjs`、`node --check frontend/main.js` 通过。Impeccable detector 无发现（首次背景改动后运行）。原生 Tauri 桌面窗口未做本轮实机视觉验收；浏览器使用模拟 IPC，不证明真实桌面权限与启动流程。

## 应用图标替换 · 2026-11-12 · 未发布

- 用户提供的 `frontend/assets/icon.png`（1254×1254，黑 8＋白球＋球杆＋木金边框）替换应用图标：`sips` 重采样 1024×1024 覆盖 `assets/desktop-icon-billiards.png`；`assets/desktop-icon-billiards.ico` 由 Python 标准库 PNG 解码＋盒滤波缩放重建（16/24/32/48/64/128 BMP 条目＋256 PNG 压缩条目，共 269KB），`sips` 解包 256 条目渲染确认内容正确。`tauri.conf.json` 引用路径不变。
- macOS `.app` 重新打包（`npm run build -- --bundles app`）以嵌入新图标；Finder／Dock 实际显示效果待原生确认（macOS 图标缓存可能需要重启 Dock 或重新挂载）。

## T-021 · 2026-11-12 · 原始图标显示（未发布）

- 用户确定图标保留原始比例、轮廓和透明背景，仅有淡接触阴影。删除 cover 裁切／8% 过扫、逐像素球面变形、圆形裁切、底色和图标材质覆盖，改为原图最大边 contain 至物理直径。白球、黑八、缺图编号后备继续使用已有 matcap 与高光；碰撞、瞄准与悬停物理半径未修改，图标读取仍为现有 64×64，本轮未扩大读取尺寸。
- `tests/ball-preview.html` 使用真实 renderer 和模拟状态：非方形透明孔洞图、带完整方角的 Word 图、带透明留白文档，分别以 23/48px 半径、DPR 1/2 在本机 Chrome headless 运行。对照直接 contain 绘制的参考，检查不透明均匀区域 RGB 差 ≤2、透明孔洞和上侧留白显示原台面；两组全部 PASS。像素边缘因浏览器滤波不参与严格色差比较，完整方角与轮廓通过截图／不透明区域检查。测试以新快照数组触发真实图层缓存更新，未改产品缓存契约。
- `node --check frontend/table-renderer.js`、`npm test`（10 项 Rust、3 项 Node 通过，真实 Finder 性能测试沿用忽略）、`npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check` 通过。首次 Rust 检查曾被工作区应用图标 `is not RGBA` 阻断，工作区后续图标修正后重新运行通过；本轮未改应用图标。
- Impeccable detector 无阻断项，仅对测试页面继承文字色报 advisory；测试页已显式设置浅色文字。未执行 Tauri 原生桌面操作／Windows 验收或原生性能测量；64×64 原图在大幅放大时仍有分辨率上限。


## T-022 · 2026-11-12 · 应用图标替换（未发布）

- 原图：用户提供的 `/Users/hassanzhang/Desktop/c046cae9-6ef8-475f-a5ff-d11f9428282e.png`（1254×1254 RGBA）。`frontend/assets/icon.png` 按字节原样保存；Tauri 原生 CLI `tauri icon <原图> --output /tmp/billiards-new-app-icons` 生成兼容图标，取 512×512 RGBA `icon.png` 更新 `assets/desktop-icon-billiards.png`，`icon.ico` 更新既有 ICO 路径。未重绘原图，未改变原始比例或透明背景。
- Pillow 只读检查：PNG 为 512×512 RGBA；ICO 包含 16/24/32/48/64/256px 六种尺寸，RGBA；源图副本与用户原图逐字节一致。
- `npm run build -- --bundles app` 成功，产物为 `src-tauri/target/release/bundle/macos/Desktop Icon Billiards.app`（13.58 MiB）。按包内 Info.plist 查得 `Resources/Desktop Icon Billiards.icns`，其 512px 图层与本轮 PNG 解码后逐像素一致。只更换素材，无代码／配置逻辑变更，未重复无关游戏测试。
- 未覆盖：Windows 实机图标、macOS Finder／Dock 图标缓存刷新与重启后的实际显示；未发布或安装到系统目录。
