---
name: verify-desktop-billiards
description: 修改本项目的台球、桌面集成、加载或构建功能后，按功能地图执行回归并区分模拟验证、真实原生验收及性能测量。
---

在仓库根目录工作。先读 [FEATURE_MAP.md](../../../FEATURE_MAP.md)，选择改动涉及的功能及调用方。

- 台球：`cargo test --manifest-path src-tauri/Cargo.toml physics::tests`，`node tests/table-input.mjs`。核对拉杆手势、取消、微调和摆白球，不能用旧版按住计时蓄力步骤代替。
- 桌面加载：`cargo test --manifest-path src-tauri/Cargo.toml desktop::`，`node tests/desktop-loading.mjs`。IPC 模拟不证明 Finder/Explorer 实机权限正常。
- 集成：`npm test`、`npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check`；构建配置变化后在目标平台构建。Windows 构建缺工具时记录原始错误，不能把 macOS 编译记成 Windows 验收。
- 界面／窗口：真实应用中验证桌面模式和明确标记的试玩、拉杆松手、空格或右键取消、重开、辅助线、白球复位、结束与退出。窗口层级变化需在小组件可见时验证遮挡及普通应用切换，不修改用户系统设置来掩盖问题。
- 性能：先记录平台、构建类型、图标数、场景、样本量和测量边界；分别测静止、瞄准、拉杆和滚动。源码中的时间间隔不是耗时，磁盘大小不是帧率，模拟 IPC 不是原生延迟。不输出未测量的帧率，不把一次微基准认作用户桌面的瓶颈。

更新 [VALIDATION.md](../../../VALIDATION.md) 的实际命令、结果与未覆盖项；更新受影响的功能地图路径。保存可运行包后可执行 `cargo clean --manifest-path src-tauri/Cargo.toml` 回收构建产物，不能误删唯一交付包。不要为验证保留第二套产品或大体量构建缓存。
