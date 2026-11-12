# 迁移任务（未发布）

## 已实现与已检查

- [x] T-001 / F-001：建立 Tauri 2 工程，启动与构建入口切换至 Rust + Tauri；macOS ARM64 包构建通过。
- [x] T-002 / F-002：Rust 物理引擎、Canvas 绘制和鼠标输入接入；5 项 Rust 行为回归、Clippy 与格式检查通过。
- [x] T-003 / F-003、F-004：Finder / AppKit、Explorer / Shell COM 适配及桌面覆盖窗口实现；不修改原图标。macOS 编译与 Windows 适配模块类型检查通过。

- [x] T-005 / F-004：修复读取桌面无限等待；Finder 子进程超时回收、前端等待上限及错误／超时后试玩回归通过。真实权限弹窗操作仍归 T-004。

- [x] T-006 / F-002、F-005：拉杆击球、球面图标、开口库边、微调与送杆实现；Rust／Node 回归通过，旧绿布版原生台面及用户 4/51 入袋截图已验证。音效取消；最新素材与壁纸复验见 T-011。

- [x] T-007 / F-003：修正 macOS 台面层级至普通应用窗口之下，覆盖桌面小组件；不修改系统桌面设置。编译和构建结果见 VALIDATION.md，小组件实际遮挡仍需原生验收。

- [x] T-014 / F-002、F-005：拉杆并入状态机（`Phase::Pull`，快照移除 `pulling` 字段）；台面新增开局／重开图标飞入动画、入袋缩小幽灵加粒子环、拉杆力度弧；击球按钮补 hover／active；空闲时前端跳过每帧 IPC，约 0.9s 唤醒刷新计时。`npm test`、`npm run check`、`cargo fmt --check` 通过；动效与功耗收益待原生视觉与帧剖面验收（T-009 边界）。

- [x] T-015 / F-002：黑八规则。`pick_seven` 每局从桌面池随机抽 7 个图标（时钟种子 xorshift，池保留于 `Game.pool` 供重开重抽）；黑 8 渲染为黑色数字球并占据球阵最深列中央（`Table.black8`）；先清图标球再进黑 8 获胜，黑 8 提前落袋进入 `Phase::Failed` 并冻结计时；重开经 `restarted` 事件让台面重拉素材并重放动画。新增 `black_eight_must_be_pocketed_last` 测试；`npm test`、`npm run check`、`cargo fmt --check` 通过；实机发球随机性与失败提示待原生验收。

- [x] T-016 / F-005：球杆贴图化。`assets/cue.png`（用户素材，透明背景、杆头朝左）替换手绘梯形杆：贴图按 aim 旋转，亮带用屏幕空间 `source-atop` 渐变固定在上沿不随杆旋转；布面接触影（blur 3px、alpha 0.13、下偏 2.5px）画在球之下；叠放先球后杆，杆头经 `destination-out` 只在与白球重叠段裁开；收势从 12px 穿球改为 4px 短随动；stroke→rolling 瞬间在触点闪 (130ms) 微光点。`node --check`、Node 回归通过；原生视觉待实机验收。

- [x] T-017 / F-002、F-005：球材质与发球数量。每局目标球由 7 增至 14（`pick_icons`，池不足 14 拒绝开局）；接触阴影从烘焙精灵拆出，改为球层内偏下椭圆软影，消除贴纸叠影；图标球面压缩（12 条 sin 竖条，内切 0.8r，留球色边）并叠 `assets/ball-matcap.png`（multiply 对齐 504/512）＋固定左上锐高光＋0.2 边缘座光，光照方向全桌统一；白球同 matcap 更白，黑 8 同理。修复两处渲染缺陷：黑 8 槽位后的图标索引未前移导致出现第二个"黑 8"（`ballImage` 映射与悬停名称同步修正）；`cueGeom` 未返回 `white` 使杆图层首帧抛 `TypeError` 且循环停止。`npm test`、`npm run check`、`cargo fmt --check`、`node --check` 通过；matcap 视觉与阴影观感待原生验收。

## 待验收

- [ ] T-004 / F-001～F-004：完整跨平台原生操作、Finder 权限、Windows 安装包、DPI 与进程退出验收。macOS 控制面板和试玩台面已打开；其余平台／操作证据与阻塞见 [VALIDATION.md](VALIDATION.md)。

已按用户要求初始化本地 Git；基线提交为 `db053ad`。本轮未发布，版本保持 0.1.1。


## 审查整改

- [x] T-008 / F-001：保留可运行应用后清理 5.4 GiB 构建产物和 Node 依赖；关闭增量缓存与调试符号；新增可检索 Feature Map 和项目本地验证 skill。并行构建仍会重新生成缓存，不能将一次清理描述为永久磁盘上限。
- [ ] T-009 / F-002、F-005：补原生帧循环分段测量，再验证静止场景的 IPC 调度优化、紧凑契约、时钟一致性及渲染缓存。独立模拟微基准已记录，尚无用户桌面的原生 IPC / Canvas 剖面。
- [ ] T-010 / F-001～F-005：待并行编辑同步后，按功能重组目录、删除已迁移 Python 产品及打包入口、同步测试名称和手势文档。旧版代码已保存在 Git 基线中，不作为长期并列产品。

## 本轮台面素材

- [ ] T-011 / F-005：清晰桌面壁纸与用户指定边框已实现，透明度、六袋锚点／等比映射、Rust／Node 测试、Clippy 和 macOS 构建通过。Mac 锁屏阻止最新皮肤的原生预览；解锁后仍需核对实际接缝、壁纸及进球对齐。实现提交可按 `feat(T-006,T-011): use wallpaper and supplied billiards frame` 检索。

## 桌面启动

- [x] T-012 / F-004、F-006：移除试玩入口及后端分支；Finder 批量读取、64×64 PNG 图标、Rust 暂存数据减少 IPC。自动回归通过，真实桌面 51 图标完整读取一次测量为 1034 ms；原生控制面板单入口和真实台面已验证；未记录精确端到端耗时，边界见 VALIDATION.md。提交按 `perf(T-012): streamline desktop-only startup` 检索。

## 手感与体积

- [x] T-013 / F-002、F-005：`frame` 改为紧凑快照（扁平 f32 球数组），静态几何随 `initial` 下发并消除双重序列化；碰撞改空间哈希；渲染端每球预烘焙 sprite 加整层缓存；release 开 LTO。同机同法对照实测：300 图标瞄准帧载荷 32503→8056 字节，2000 图标满力击球单帧 23.5→4.9 ms。模拟基准与包体见 VALIDATION.md；用户桌面原生帧剖面仍按 T-009 待补。

## 启动面板美化

- [x] T-020 / F-001：使用用户指定背景，标题居中，统一暖金色文字、主按钮和统计区边框；删除底部退出快捷键与版本小字，保留退出功能。Chrome 460×248、DPR 2 视觉及启动／统计／辅助线／权限失败回归通过，原生窗口观感待验收。提交按 `style(T-020): center and polish launcher controls` 检索。

## 球杆细节修复

- [x] T-018 / F-005：加载时清除球杆贴图近透明杂色并裁切有效像素；杆径独立于长度，保留短窗口杆头与环饰；按实际杆径收窄屏幕空间高光。增加 `tests/cue-preview.html`，Chrome 在 400/900px 高度、5 个角度及 DPR 1/2 下通过杆径与杆外像素检查。完整自动回归、Clippy 与格式检查通过；原生 Tauri 视觉与操作仍待验收。实现提交按 `fix(T-018): preserve cue detail in short windows` 检索。

## 球面材质重构（三球测试）

- [x] T-019 / F-002：伪 3D 球体不合格（短圆柱感、横向色带、厚重边框、图标平面化、光照不一致）。重构：图标按不透明包围盒 cover 裁切＋8% 过扫**铺满整个球面**；逐像素轻微逐轴球面变形（平面贴印与角映射各半、指数 0.9，中心接近 1:1、直线保持直线、仅边缘压缩）；弃用 12 条 sin 竖条、同心方形→圆盘映射（全半球角包裹导致中心放大 1.57× 与边缘环绕，用户反馈变形过重）与彩色球色谱（图标球统一石色底 `#a89e8d`，白球 `#f7f4ea` 无印刷，黑 8 保持不变）；`ball-matcap.png` 重新接入：`overlay` 合成（对齐 504/512）提供连续明暗＋菲涅尔边，其上保留小锐镜面高光。新增 `tests/ball-preview.html`（白球／文档图标球／Word 图标球，无头 Chrome 截图对比曲率、贴合度、光照一致性）。`npm test`、`npm run check`、`cargo fmt --check`、`node --check` 通过；三球截图已产出，批量应用走同一代码路径；实机原生视觉待验收。

## 原始图标显示

- [x] T-021 / F-002、F-005：按用户确定方案替代 T-019 的球面图标印刷。删除图标 cover 裁切、球面变形与材质叠加，原图 contain 显示、保留透明与完整轮廓，只加淡接触阴影；白球、黑八及圆形碰撞保持不变。更新 `tests/ball-preview.html` 检查两种半径、DPR 1/2 下的原色、比例、方角、透明孔洞与留白；回归证据见 VALIDATION.md。提交按 `fix(T-021): preserve original desktop icon appearance` 检索。

## 应用图标替换

- [x] T-022 / F-001：以用户 `c046cae9-6ef8-475f-a5ff-d11f9428282e.png` 替换应用图标原图，使用 Tauri 图标工具生成 512×512 RGBA PNG 及多尺寸 ICO，更新既有素材路径；macOS `.app` 构建成功，包内 ICNS 512px 图层与新 PNG 逐像素一致。Windows 实机显示未验收。提交按 `chore(T-022): replace app icon with supplied billiards artwork` 检索。

## 连杀播报

- [x] T-023 / F-002：连杀播报。后端按杆统计连续进球（`Table.streak`／`first_blood`／`announce`）：一血只在开局第一次进球播报一次；连进两杆起播报 `02_Double_Kill`…`05_Penta_Kill`（五杆封顶）；中断（空杆或白球落袋）清零，之后必须重新连进两杆才再播报，单杆静默。结算那一杆通过 `announce` 事件发往台面窗口（`window.emit`，不受前端空闲跳帧影响）。前端新增全屏横幅覆盖层：暗角压暗＋横幅自 0.35 倍旋转弹入＋红光溢出，2.4 秒淡出，素材 `frontend/assets/01_First_Blood.png`…`05_Penta_Kill.png` 后台预取；新增 `tests/announce-preview.html` 冻结动画中段便于截图比对。
- [x] T-024 / F-002：修正清台判定。球阵按列推送、黑 8 位于最深列中央，其后仍有图标球（14 球局 black8=13，球 14、15 是图标），此前 `icons_left`／快照 `pocketed`／面板统计只数 `balls[1..black8]`——还剩 2 个图标球时打进黑 8 即误判清台、进度卡在 12/14。改为统计除白球与黑 8 外的全部球；新增 `win_requires_every_icon_ball` 回归，并修正两个编码旧行为的既有测试（`black_eight_must_be_pocketed_last`、`scratch_pauses_then_hands_ball_to_player`）。
