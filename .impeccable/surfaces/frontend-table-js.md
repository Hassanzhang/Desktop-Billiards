---
version: 1
slug: "frontend-table-js"
primary_target: "frontend/table.js"
related_targets: ["frontend/table.html","frontend/style.css"]
---

# 台面 · Experience

用户已指定经典台球材质与操作，确认鼠标后拉、方向锁定、松手出杆。仅修改台面和受影响控制说明，保留真实桌面图标、清台计时及退出恢复；用户明确取消音效。

## Direction contract

THESIS: 一次连续的瞄准、后拉、送杆、触球动作，让桌面图标成为球面图案。

OWN-WORLD: 清晰桌面壁纸（无壁纸时用深绿呢面）、用户指定图片的深红木框、金属包角、金边、菱形点和皮革网兜；图标球有圆形裁切、受光面和接触阴影。系统字体只负责操作说明。

STORY: 玩家直接看到完整球桌和圆球，鼠标瞄准后反向拉杆；侧边力度标尺反馈同一力量，幽灵球解释第一碰撞。

FIRST VIEWPORT: 主显示器工作区内完整球桌，桌内外使用同一幅桌面壁纸、同一比例与位置裁切；左侧窄力度栏、底部一句操作指引，文件名仅悬停可见。球杆皮头在前送末端触球，白球此刻开始移动。

FORM: 用户明确指定的现有台面改造，code-led；seed key: brief-pinned-billiards，无概念抽签。指定图片抠透明后作为十二块边框，固定袋口与包角比例，只拉长直木条；六个素材袋口锚点与物理位置对齐。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
