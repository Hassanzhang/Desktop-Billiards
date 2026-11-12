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
  felt-center: "#237864"
  felt-edge: "#134d40"
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

以清晰桌面壁纸和用户指定的深红木纹边框组织台面；金属包角、金边、菱形点与皮革网兜来自透明边框素材，没有可用壁纸时才显示绿布。真实文件图标被裁进统一圆球，以球面高光和接触阴影保持可击打的体积感。

界面保持低密度：Canvas 承载球桌与运动，系统字体承担进度、力度和操作说明。本文记录源码已实现的视觉规则；壁纸内容由用户桌面决定，不指定壁纸色调；边框身份由用户选定的素材固定。

**Key Characteristics:**
- 桌内外共享同一幅壁纸的完整桌面 cover 坐标，桌内不加模糊或呢面。
- 边框采用透明栅格素材分块映射，球面与绿布回退以 Canvas 程序绘制。
- 后拉锁定方向，前送末端触球，侧栏显示同一力度。

## Colors

### Primary

深红木纹、金属包角、金边和皮革网兜构成素材边框；不再绘制旧绿色橡胶库边。力度控件保留暖金色。控制面板的薄荷绿主按钮沿用已有界面，台面击球按钮使用暖暗色材质。

### Secondary

边框颜色由 `frontend/assets/table-frame.png` 保留，不将图片采样色虚构成 CSS 或 Canvas 色彩 token。`felt-center / felt-edge` 仅用于无壁纸时的径向绿布回退。

### Neutral

深色页面底、奶白母球与偏暖的文字形成基础层。桌外壁纸覆以 `#11191399` 压暗层；桌内只剪裁原壁纸，保留完整桌面的比例和位置。错误文案使用暖浅红。图标球缺图时才显示彩色编号球，不据此伪装真实桌面文件。

**The Shared Wallpaper Rule.** 桌内外必须复用完整桌面的居中 cover 变换；桌外可压暗，桌内直接显示清晰原图。

## Typography

系统字体栈见 frontmatter；它服务于说明和控件，不承担装饰性展示标题。控制面板标题、正文、统计值、标签分别使用 `title / body / statistic / label`；台面说明、进度、力度和文件名均使用标签字号。数字启用 `tabular-nums`。正文段落行高 (1.6)，文件名行高 (1.5)，按钮行高 (1.4)。Canvas 缺图编号使用 `system-ui`、字重 (600)，字号为 `max(8, radius × 0.67)`；不把这一后备字号推导成固定排版层级。

## Layout

台面填满视口，Canvas 在设备像素比下绘制，交互坐标映射到 `initial.width / initial.height`。球桌几何来自 `src-tauri/src/physics.rs`：左边界为 `max(视口宽度 × 0.09, 112)`，右边界为视口宽度的 (94%)，上下边界为高度的 (11% / 89%)。球的排列 pitch 按项目数和可用区域计算，上限 (50px)；所有球半径均为 `pitch × 0.46`。库深为 `clamp(10, 台面高度 × 0.032, 24)`；袋半径为 `clamp(12, 球半径 × 1.65, 38)`。库深仍用于物理多边形，边框外扩改由素材分块锚点确定。这些是代码计算来源，不是独立 CSS token。

力度栏距左侧 (8px)，垂直居中，宽 (48px)，内部间隔引用 `shot-gap`。原生竖向 range 尺寸 (44 × 160px)，击球按钮最小高度 (40px)。顶部进度居中，距上 (12px)；底部提示距左 (70px)、右 (24px)、下 (10px)。唯一 CSS 响应式断点是 `max-height:500px`：range 缩至 (100px)，底部提示改为 (11px) 且距下 (4px)。不假定手机布局已经验收。

文件名最大宽度 (220px)，出现在球下方 (球半径 + 12px)，由 JS 限制横向位置与底边位置。控制面板使用 (18px) 外边距、三列统计、可换行的按钮组；这些沿用既有 CSS，不新增导航或卡片体系。

## Elevation & Depth

深度来自素材与球面受光：边框的深红木纹、金属包角、金边及皮革网兜由透明 PNG 承载，旧程序木纹、库边渐变和袋井绘制已删除。球先绘制接触阴影，再在圆形剪裁内叠加图标、明暗渐变和左上高光。绿布回退使用固定种子 (47)、(128px) 重复纹理；边框使用新增栅格素材，球面与回退绿布继续由程序绘制。

边框的明暗由图片承载，不再额外绘制旧木框阴影；球阴影为 `#02130fb3`、blur (5)、offset (2,4)；球杆阴影为 `#00110c80`、blur (3)、Y offset (3)。文件名浮层使用 `0 3px 10px #0005`。Canvas 的 blur 单位与 CSS 阴影分开记录，不将球桌阴影伪装成可复用卡片层级。

**The Shared Geometry Rule.** 边框分块映射消费物理引擎的 bounds 与 pocket_radius；物理边袋中心按素材锚点外移，不能把图像外框当成碰撞矩形。

## Shapes

边框采用 `frontend/frame-skin.js` 的十二块映射：基准 (1536 × 1024)，源分割 X 为 (0,232,652,884,1304,1536)，Y 为 (0,224,800,1024)，跳过中间一行的三个中央格。口袋组件按 `pocket_radius / 55` 等比缩放，直木条随视口伸展；不将整张素材直接拉伸。六袋基准锚点为 (123,116)、(768,102)、(1413,116)、(123,908)、(768,922)、(1413,908)。上下边袋的物理中心相对台面边界分别向外移 `14 / 55 × pocket_radius`。

素材来自用户图 `/Users/hassanzhang/Desktop/f77025b5-7692-47d5-b717-871c7e57ef5b.png`，经内置 image_gen 去除背景，透明结果保存在 `frontend/assets/table-frame.png`；原形、深红木纹、金属包角、金边、网兜与菱形点保留。这里只记录素材来源与装配方式，不宣称分块接缝及袋口已通过原生视觉验收。

所有图标球、母球和幽灵球使用真实球半径；真实图标等比 contain 后裁入圆形。按钮和统计容器使用 `controls` 圆角，文件名使用 `tooltip` 圆角。

## Components

### Buttons

面板按钮沿用深绿底、细边框和薄荷主按钮。通用按钮具备 hover、active、disabled 与 focus-visible；禁用透明度 (0.55)，焦点轮廓 (2px)、外移 (3px)。主按钮 hover 使用 `primary-hover`。台面击球按钮使用暖暗底、暖边框和米白文字，并带有独立的 hover（暖底暖边加深）与 active（更深底、白字）变体；禁用指针为 default，不继承面板的 wait 指针。

### Inputs / Fields

力度使用原生 range：垂直方向 (`vertical-lr` + `direction:rtl`)，范围 (1–100)，默认 (35%)，`accent-color` 使用 `shot-accent`。获得焦点时为暖色 (2px) 轮廓、外移 (2px)。拉杆中或非 ready 阶段禁用 range 和击球按钮；拉杆时百分比改为 `#fff1b7`，反馈实际 charge。

### Table / Cue

ready 时移动瞄准；按住锁定方向并向后拉杆（`pull` 阶段），松手进入 stroke。球杆长度为 `min(400, initial.height × 0.48)`；后拉距离为 `10 + charge × max_pull`，最大后拉来自 `clamp(80, 台面高度 × 0.24, 180)`。stroke 阶段球杆间距按 `1 - stroke_progress^1.6` 收敛，前送总时长 (0.12s)，末端才使母球运动。进入 rolling 后保留 (70ms) 收势：`cue_follow` 从 1 衰减到 0，杆头间距为 `-12 × (1 - cue_follow)`。stroke 与收势均锚定击球时的 `stroke_origin`，避免球杆跟随移动母球；ready 与 pull 阶段锚定当前母球。球杆在 ready / pull / stroke 或 cue_follow 有效且母球未入袋时绘制。按下拉杆保持已有 aim，保留此前方向键或滚轮微调结果。

pull 阶段在母球外圈绘制力度弧：半径 `radius + 7`、线宽 (3px)，弧长为 `charge × 2π`（自 12 点起顺时针），颜色随 charge 从薄荷经琥珀插值到炭红；底轨为半透明暖白整圆。拉杆时辅助线长度同步跟随实际 charge。

方向键与滚轮微调，Enter 使用侧栏所选力度；右键、拉杆中空格、失焦或 pointercancel 取消蓄力。Esc 退出。滚动中、白球入袋等待、手中球和完成阶段使用对应状态文案；白球入袋后短暂停顿即交由玩家点击台面空处摆球，不做自动摆回。这里记录真实状态机，不为装饰补充新转场或声音。

开局与重开时图标球从桌面散点飞入球阵：每球一条三次缓出曲线 `k³(10 + k(−15 + 6k))`，按 `i % 7` 交错 (0.06s)、单球历时 (0.8s)，飞行路径叠加 `sin²(πk)` 的侧偏弧线；动画期间不绘制辅助线与球杆，结束即回到正常绘制。图标入袋时在袋口播放 (0.55s) 缩小幽灵（缩至 0.54、alpha `(1 − fade)^1.35`）并叠加 9 点薄荷色粒子环，间距与尺寸按球半径缩放。重开通过 `restarted` 事件触发重放。

台面空闲（无输入、无拉杆或滚动动画、无飞入／入袋特效）时前端跳过每帧 IPC，约 (0.9s) 唤醒一次仅刷新计时；任何指针或键盘输入立即恢复逐帧推进。

### Guides / File Name

辅助线开关打开时使用 (5,7) 虚线；入射、白球和目标路线分别以暖白、浅蓝和黄铜色区分。幽灵球是浅色半透明圆及 (1.5px) 描边。文件名仅 ready 且无飞入／入袋动画时，在悬停未入袋图标球上出现；浮层不捕获鼠标。Canvas 与原生 range / button 保持键盘焦点轮廓，错误使用 alert，操作提示使用 status。

## Do's and Don'ts

### Do:
- **Do** 复用物理引擎输出的球半径与素材映射边界，保持六袋锚点和碰撞中心对齐。
- **Do** 保持桌内壁纸清晰、圆球裁切及用户指定边框的分块装配；壁纸加载失败时回退绿布。
- **Do** 通过力度百分比、状态文案和焦点轮廓提供操作反馈。

### Don't:
- **Don't** 为当前台面添加音效；用户已明确取消。
- **Don't** 将真实文件图标替换为模拟桌面图标并冒充真实桌面。
- **Don't** 将旧绿布截图视为最新壁纸台面的原生实拍或验收证据。


记录边界：本次根据源码提取，未宣称最新壁纸版已完成原生实拍或视觉复核。旧版绿布截图仅是继承参考。台面击球按钮的 hover／active 变体与 disabled 指针已实现；飞入动画与入袋粒子来自渲染层实现，未经原生实拍验证。没有核定任意用户壁纸上的文字对比度，不能将静态 token 记录当成可读性通过证明。
