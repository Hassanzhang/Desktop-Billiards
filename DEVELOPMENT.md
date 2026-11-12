# 当前技术设计

## Rust + Tauri 2（未发布）

- `src-tauri/src/physics.rs`：平台无关物理模拟。沿用原版球阵、阻力、碰撞冲量、反弹系数、击球延时、玩家摆白球、计时和辅助线预测。
- `src-tauri/src/main.rs`：游戏生命周期、IPC、单实例、全局退出快捷键。物理计算在 Rust 内执行，前端每次只请求一帧，避免并发请求堆积。
- `desktop_macos.rs`：通过系统 `osascript` 的 JavaScript for Automation 批量读取 Finder 桌面项目，查询超过 30 秒时终止并回收 `osascript`，并行读取标准输出与错误以避免管道填满；再用 AppKit NSWorkspace 提取 PNG 图标；原生台面窗口使用 `NSNormalWindowLevel - 1`：覆盖 Finder 图标及桌面小组件，保持普通应用窗口在其上方；不修改系统小组件开关。
- `desktop_windows.rs`：通过 Shell COM 的 IShellWindows → IShellBrowser → IFolderView → IShellItemArray 读取实际 Explorer 项目和缩略图；Tauri 台面作为 SHELLDLL_DefView 子窗口。
- `frontend/`：无框架 HTML/CSS/JavaScript，Canvas 绘制及鼠标输入，独立控制面板显示状态。使用系统 WebView，无 Node 前端运行时。

## 安全与恢复

原图标不移动、不隐藏、不更改排列设置；桌面台面覆盖工作区，关闭或进程退出时由系统销毁窗口，无持久化恢复日志。旧 Python 看门狗不再使用。不会读取文件内容、截屏或采集音频；系统提取缩略图时可能读取本地文件。无自动网络请求。

窗口只加载打包资源；CSP 限制脚本来源。IPC 检查状态、数值和图标数据；正式模式读取失败明确提示。主显示器、工作区及缩放变化时停止推进，并提示结束重开。仅提供真实桌面游戏。前端图标准备等待上限为 45 秒，超时恢复按钮并忽略迟到结果；此保护不取消已开始的 AppKit 图标提取。读取完成后单独显示创建台面的状态。

macOS 需要 Finder 自动化权限，正式分发还需要开发者签名、公证及 Apple Events entitlement。Windows 需要 Explorer 桌面与 WebView2。各平台包应在对应系统构建；macOS 默认只构建当前架构。

## 迁移差异

旧 Python 产品及其测试、依赖、打包与更新链路已移除，迁移对照通过 Git 历史查阅。新台面读取本地 PNG/JPEG 壁纸，桌内外按同一 full-desktop cover 坐标绘制，桌内不模糊、不覆盖绿布；不可读取或动态壁纸回退为呢面。静态木框、库边、袋口和背景缓存到离屏 Canvas。图标飞入和入袋粒子已在 Canvas 渲染层实现；旧版检查更新、赞赏入口未迁移。版本保持 0.1.1，本轮尚未发布。

## 拉杆与台面（T-006，未发布）

按下时保存后拉原点并锁定瞄准；鼠标位移在反向击球轴上的投影决定力度，横向移动不改变方向。快速按下／松手保留原点与两个输入边沿；失焦、右键、空格取消。零后拉不出球，取消最低 0.18 力度；120 ms 前送进度与物理触球时刻共用状态，触球后的 70 ms 保留原位球杆收势；按下拉杆保持已微调的方向。支持方向键／滚轮微调及侧边原生 range + 击球按钮／Enter 备选操作。

白球与目标球等半径。六段库边四边形用于圆球与线段接触及辅助线射线；袋口斜角改变碰撞法线，袋口内不再设矩形墙。图标直接等比 contain 绘制，保留透明背景和完整轮廓，只叠淡接触阴影；白球与黑八保留球体材质。精灵缓存及动画复用同一原图路径，碰撞和悬停仍为圆形半径。文件名仅悬停。幽灵球显示第一目标球的接触位置。仍为无旋转的二维物理，不加入八球分边、加塞或新犯规；音效已按用户要求取消。


## T-008：构建体积与验证入口

Cargo 开发／测试配置为 `debug = 0`、`incremental = false`，发布配置同时 `strip = "symbols"`。保留 `.app` 后使用 Cargo 官方清理命令删除构建缓存；不把缓存搬到其他目录冒充缩小项目。Node 依赖可通过锁文件重新安装。功能检索入口为 FEATURE_MAP.md，本地验证流程位于 `.agents/skills/verify-desktop-billiards/SKILL.md`。

## 指定边框素材（T-011，未发布）

`frontend/assets/table-frame.png` 由用户图片通过内置 image_gen 抠透明得到，外侧和台面区域透明、六个皮革网兜保留。提示词和来源见 `.impeccable/assets/table-frame.prompt.md`，PNG 内嵌同一提示词。`frontend/frame-skin.js` 按 1536×1024 的六个袋口锚点绘制 12 块：袋口／包角等比，只有直木条伸展，避免宽屏拉扁洞口。桌内外共享壁纸坐标，桌内不模糊、不覆盖绿布，无壁纸时回退呢面。中袋向外偏移 `14 / 55 * pocket_radius`，匹配素材中袋位置。

`initial` 仅下发前端需要的静态几何；袋口坐标留在 Rust 物理引擎内，库边厚度仅在构建碰撞几何时计算，不再保存或下发。应用图标原始素材保留为 `assets/icon-source.png`，避免进入 `frontendDist`。

## 桌面启动优化（T-012，未发布）

Finder 项目名称和 URL 各一次批量查询，替代逐项目跨进程调用。AppKit 将每个图标直接绘制到 64×64 RGBA 位图后编码 PNG，避免 TIFF 的多分辨率表示与大图编码。`prepare_desktop` 只返回图标数量，真实图标暂存 Rust；`open_game` 消费已准备数据，`initial` 才将图标交付台面。没有图标数据经控制面板来回传输，也没有试玩参数／示例图标分支。

可选实机探针：`cargo test --manifest-path src-tauri/Cargo.toml native_desktop_startup_profile -- --ignored --nocapture`，读取真实 Finder 并输出耗时、数量和 PNG base64 总字节数，不输出文件名；默认测试跳过该系统依赖检查。
