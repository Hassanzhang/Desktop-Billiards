---
name: Desktop Icon Billiards
description: 以桌面壁纸和真实图标构成的经典木库台球台面
colors:
  background: "#202421"
  panel-background: "#0d1917"
  text: "#e2f2ec"
  text-muted: "#a8c3b9"
  primary: "#69ddb3"
  primary-hover: "#86eac8"
  button: "#1b3029"
  button-hover: "#28483b"
  button-active: "#335d4d"
  button-border: "#3b5a50"
  focus: "#9ff4cf"
  error: "#ffd2be"
  wood-start: "#533423"
  wood-light: "#895c38"
  wood-middle: "#65432b"
  wood-end: "#38271f"
  felt-center: "#237864"
  felt-edge: "#134d40"
  cushion-light: "#328b6e"
  cushion-middle: "#226d55"
  cushion-dark: "#12402f"
  brass: "#d8bd86"
  cue-ball: "#f4f0df"
  shot-background: "#302b22"
  shot-border: "#706045"
  shot-text: "#f2e5c5"
  shot-accent: "#d3b678"
  table-focus: "#dfc48b"
  tooltip-background: "#17251fed"
  tooltip-text: "#f1e8ce"
typography:
  title:
    fontFamily: '"Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: '"Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
  label:
    fontFamily: '"Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
  statistic:
    fontFamily: '"Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "28px"
rounded:
  tooltip: "4px"
  controls: "6px"
  wood: "26px"
spacing:
  actions: "7px"
  shot-gap: "10px"
  label-gap: "12px"
  statistics: "16px"
  panel: "18px"
components:
  button:
    backgroundColor: "{colors.button}"
    textColor: "{colors.text}"
    rounded: "{rounded.controls}"
    padding: "7px 11px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel-background}"
    rounded: "{rounded.controls}"
    padding: "7px 11px"
  button-shot:
    backgroundColor: "{colors.shot-background}"
    textColor: "{colors.shot-text}"
    rounded: "{rounded.controls}"
    padding: "8px 5px"
    width: "46px"
  tooltip:
    backgroundColor: "{colors.tooltip-background}"
    textColor: "{colors.tooltip-text}"
    rounded: "{rounded.tooltip}"
    padding: "7px 10px"
---

# Design System: Desktop Icon Billiards

## Overview

**Creative North Star: "桌面上的经典球桌"**

以清晰桌面壁纸、暖木框、绿色橡胶库边、黄铜菱形点和暗皮袋组织台面；没有可用壁纸时才显示绿布。真实文件图标被裁进统一圆球，以球面高光和接触阴影保持可击打的体积感。

界面保持低密度：Canvas 承载球桌与运动，系统字体承担进度、力度和操作说明。本文记录源码已实现的视觉规则；壁纸内容由用户桌面决定，不指定固定色调或图片资产。

**Key Characteristics:**
- 桌内外共享同一幅壁纸的完整桌面 cover 坐标，桌内不加模糊或呢面。
- 木框、库边、袋口、球面以 Canvas 程序绘制。
- 后拉锁定方向，前送末端触球，侧栏显示同一力度。

## Colors

### Primary

绿色橡胶库边构成台面结构，黄铜色用于菱形瞄点和力度控件。控制面板的薄荷绿主按钮沿用已有界面，台面击球按钮使用暖暗色材质。

### Secondary

暖木渐变按 `wood-start → wood-light → wood-middle → wood-end` 的顺序、在 (0 / 0.32 / 0.7 / 1) 处插值；库边依次采用 `cushion-light / cushion-middle / cushion-dark`，停靠点为 (0 / 0.25 / 1)。`felt-center / felt-edge` 仅用于无壁纸时的径向绿布回退。

### Neutral

深色页面底、奶白母球与偏暖的文字形成基础层。桌外壁纸覆以 `#11191399` 压暗层；桌内只剪裁原壁纸，保留完整桌面的比例和位置。错误文案使用暖浅红。图标球缺图时才显示彩色编号球，不据此伪装真实桌面文件。

**The Shared Wallpaper Rule.** 桌内外必须复用完整桌面的居中 cover 变换；桌外可压暗，桌内直接显示清晰原图。

## Typography

系统字体栈见 frontmatter；它服务于说明和控件，不承担装饰性展示标题。控制面板标题、正文、统计值、标签分别使用 `title / body / statistic / label`；台面说明、进度、力度和文件名均使用标签字号。数字启用 `tabular-nums`。正文段落行高 (1.6)，文件名行高 (1.5)，按钮行高 (1.4)。Canvas 缺图编号使用 `system-ui`、字重 (600)，字号为 `max(8, radius × 0.67)`；不把这一后备字号推导成固定排版层级。

## Layout

台面填满视口，Canvas 在设备像素比下绘制，交互坐标映射到 `initial.width / initial.height`。球桌几何来自 `src-tauri/src/physics.rs`：左右边界为视口宽度的 (6% / 94%)，上下边界为高度的 (9% / 91%)。球的排列 pitch 按项目数和可用区域计算，上限 (50px)；所有球半径均为 `pitch × 0.46`。库深为 `clamp(10, 台面高度 × 0.032, 24)`；袋半径为 `clamp(12, 球半径 × 1.65, 38)`；木框在库深外再扩 (21px)。这些是代码计算来源，不是独立 CSS token。

力度栏距左侧 (8px)，垂直居中，宽 (48px)，内部间隔引用 `shot-gap`。原生竖向 range 尺寸 (44 × 160px)，击球按钮最小高度 (40px)。顶部进度居中，距上 (12px)；底部提示距左 (70px)、右 (24px)、下 (10px)。唯一 CSS 响应式断点是 `max-height:500px`：range 缩至 (100px)，底部提示改为 (11px) 且距下 (4px)。不假定手机布局已经验收。

文件名最大宽度 (220px)，出现在球下方 (球半径 + 12px)，由 JS 限制横向位置与底边位置。控制面板使用 (18px) 外边距、三列统计、可换行的按钮组；这些沿用既有 CSS，不新增导航或卡片体系。

## Elevation & Depth

深度来自材质与受光：木纹仅位于木框剪裁区；库边渐变、高光边和暗底边包住共享的斜口多边形；皮袋圈和径向暗井嵌入木库。球先绘制接触阴影，再在圆形剪裁内叠加图标、明暗渐变和左上高光。绿布回退使用固定种子 (47)、(128px) 重复纹理；程序材质不依赖新增栅格图片。

木框阴影为 `#0009`、blur (20)、Y offset (10)；球阴影为 `#02130fb3`、blur (5)、offset (2,4)；球杆阴影为 `#00110c80`、blur (3)、Y offset (3)。文件名浮层使用 `0 3px 10px #0005`。Canvas 的 blur 单位与 CSS 阴影分开记录，不将球桌阴影伪装成可复用卡片层级。

**The Shared Geometry Rule.** 渲染直接消费物理引擎的 bounds、pockets、cushions 与球半径，不为视觉效果另造碰撞边界。

## Shapes

木框使用 `wood` 圆角；袋口是圆形暗井，库边斜口由物理多边形直接绘制。所有图标球、母球和幽灵球使用真实球半径。真实图标等比 contain 后裁入圆形，不放大成方形贴片。黄铜菱形点为上下 (4px)、左右 (2.5px) 的四点形；它们按长边六个、短边三个的位置比例排布。按钮和统计容器使用 `controls` 圆角，文件名使用 `tooltip` 圆角。

## Components

### Buttons

面板按钮沿用深绿底、细边框和薄荷主按钮。通用按钮具备 hover、active、disabled 与 focus-visible；禁用透明度 (0.55)，焦点轮廓 (2px)、外移 (3px)。主按钮 hover 使用 `primary-hover`。台面击球按钮使用暖暗底、暖边框和米白文字，实际 CSS 固定了其背景，所以不会随通用 hover/active 规则变色；不能记录一个尚未实现的台面 hover 变体。

### Inputs / Fields

力度使用原生 range：垂直方向 (`vertical-lr` + `direction:rtl`)，范围 (1–100)，默认 (35%)，`accent-color` 使用 `shot-accent`。获得焦点时为暖色 (2px) 轮廓、外移 (2px)。拉杆中或非 ready 阶段禁用 range 和击球按钮；拉杆时百分比改为 `#fff1b7`，反馈实际 charge。

### Table / Cue

ready 时移动瞄准；按住锁定方向并向后拉杆，松手进入 stroke。球杆长度为 `min(400, initial.height × 0.48)`；后拉距离为 `10 + charge × max_pull`，最大后拉来自 `clamp(80, 台面高度 × 0.24, 180)`。stroke 阶段球杆间距按 `1 - stroke_progress^1.6` 收敛，前送总时长 (0.12s)，末端才使母球运动。球杆仅在 ready / stroke 且母球未入袋时绘制。

方向键与滚轮微调，Enter 使用侧栏所选力度；右键、拉杆中空格、失焦或 pointercancel 取消蓄力。Esc 退出。滚动中、白球复位、手中球和完成阶段使用对应状态文案；手中球点击空处摆球。这里记录真实状态机，不为装饰补充新转场或声音。

### Guides / File Name

辅助线开关打开时使用 (5,7) 虚线；入射、白球和目标路线分别以暖白、浅蓝和黄铜色区分。幽灵球是浅色半透明圆及 (1.5px) 描边。文件名仅 ready 且未拉杆时，在悬停未入袋图标球上出现；浮层不捕获鼠标。Canvas 与原生 range / button 保持键盘焦点轮廓，错误使用 alert，操作提示使用 status。

## Do's and Don'ts

### Do:
- **Do** 复用物理引擎输出的球半径、库边多边形与六袋位置。
- **Do** 保持桌内壁纸清晰、圆球裁切和木库材质；壁纸加载失败时回退绿布。
- **Do** 通过力度百分比、状态文案和焦点轮廓提供操作反馈。

### Don't:
- **Don't** 为当前台面添加音效；用户已明确取消。
- **Don't** 将真实文件图标替换为模拟桌面图标并冒充真实桌面。
- **Don't** 将旧绿布截图视为最新壁纸台面的原生实拍或验收证据。


记录边界：本次根据源码提取，未宣称最新壁纸版已完成原生实拍或视觉复核。旧版绿布截图仅是继承参考。未纳入规范或修复的漂移：台面击球按钮缺少可见 hover/active 背景变化，且继承通用 disabled 的 wait 指针；这属于现有状态反馈限制，不作为后续组件的推荐规则。没有核定任意用户壁纸上的文字对比度，不能将静态 token 记录当成可读性通过证明。
