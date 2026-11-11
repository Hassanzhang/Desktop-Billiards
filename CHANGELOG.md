# 版本记录

## 未发布

- 修正 macOS 游戏台面的原生窗口层级，覆盖桌面小组件并保持普通应用在台面上方，不改变系统小组件设置。

- 新增 Rust + Tauri 2 应用入口，支持 Windows Explorer 与 macOS Finder 桌面适配。
- 共用 Rust 台球物理引擎与 Canvas 界面，提供真实桌面模式和明确标注的窗口试玩。
- 使用覆盖窗口替代修改原图标层，退出无需恢复图标布局。
- 原 Python 工程保留为迁移对照；迁移差异、验收边界见 DEVELOPMENT.md 与 VALIDATION.md。
