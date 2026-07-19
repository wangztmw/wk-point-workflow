---
name: render-refactoring-notes
description: Render 文件夹重构全量记录——从单体到模块化的 6 轮迭代
metadata: 
  node_type: memory
  type: project
  originSessionId: fd51aece-346d-47fe-95a9-dc6c6fb7d221
---

# Render 文件夹重构全记录

## 起点：重构前的状态

```
core/layout/layout-engine.js   ← 布局计算（单体文件，220 行）
core/render/                   ← 不存在
types/element-registry.js      ← tag→{html,ppt} 注册表（170 行）
types/html-registry.js         ← slide类型→模板路径（55 行）
types/ppt-extract.js           ← AST→SLIDE_DATA 投影（248 行）
templates/pages/               ← 23 个 markdown 页面模板
templates/layouts/             ← 5 个布局文件（html-layout + 4 wrapper）
templates/tag-renderer.js      ← tag slide 渲染器
```

**问题：** HTML 和 PPT 的渲染逻辑分散在 5 个地方——html-layout.js 查 REGISTRY 调元素模板，tag-renderer.js switch(tag) 调元素模板，tag-export.js 查 REGISTRY 调 ppt* 函数，23 个页面模板自己写裸 HTML，ppt-extract.js 做 AST→SLIDE_DATA 投影。

## 第 1 轮：layout-prerender

**改动：** `core/layout/` → `core/layout-prerender/`，内部拆 `layout/` + `prerender/`

**发现：** 拆了文件夹但逻辑没集中。prerender 只是把 REGISTRY 查表从 html-layout.js 移到了 prerender/index.js，没有本质变化。用户不满意，认为"换汤不换药"。

**教训：** 文件夹改名不等于架构改进。要先想清楚数据流，再决定模块边界。

## 第 2 轮：统一渲染层 render/

**改动：** `layout-prerender/` → `render/`，新增 `render.js`

**核心思路：** 所有 tag→模板的映射集中在 render.js 一个地方，HTML/PPT 引擎不再知道 tag。

```js
// render.js 作为唯一入口
renderBlocks(blocks) → block._html() + block._ppt + block.rect
renderSlide(ast)     → ast._html
```

**关键 bug 修复：**
- `fillStyleDefaults` 用新对象覆盖 block.style，丢弃了 `chartType`——PPT 端饼图消失
- `pptChart` 访问 `pptx.charts` 但没有 `pptx` 参数——bar/pie/line 图表全挂
- 瀑布图不受影响因为它走独立路径 `addWaterfallShapes`，不经过 `pptx.charts`

**教训：** 重构时要注意"哪些属性被保留、哪些被丢弃"。`Object.assign` 比新建对象安全。

## 第 3 轮：_html 从函数变死字符串

**动机：** `_ppt` 是死数据（JSON），`_html` 还是活函数——不对称。用户要求 render 阶段产出最终数据，引擎只做拼装。

**实现：** 元素模板加"流模式"——不传 x/y/w/h 时跳过 `position:absolute` 外层 div，输出纯内容 HTML。renderBlocks 直接调元素模板返回字符串，不再返回闭包。

**Split/Grid 布局适配：** 流模式不设固定宽高，用 CSS flex gap 替代手动 y 追踪。内容自然流式排列，外层 `overflow:hidden` 兜底。

**回归：** PPT 导出出现"内容挤在左上角"——因为 markdown blocks 没有 x/y 坐标，rect 全为 0。原因是 parser 输出 markdown block 时没设坐标。后来在 `normalizeToTag` 中加了自动堆叠逻辑解决。

## 第 4 轮：markdown→tag 彻底统一

**动机：** 两条路径（markdown + tag）维护成本高。老模板 23 个，每个写裸 HTML，大量代码重复（buildChartSlide 重复 8 次，renderInline 重复 4 次）。

**核心改动：**
- `parser/index.js` → 拆为 assemble + split + content + normalize + infer
- `normalizeToTag`: 给每个 markdown block 加 tag + style + 类型映射
- `TYPE_MAP`: content→stack, summary→grid, two-column→split 等
- `TAG_STYLE`: 定义每种 tag 的默认字体/颜色/加粗
- 23 个页面模板全部删除，由 renderStack/Split/Grid/TagSlide 统一覆盖

**收获：** 从 35 个模板文件减到 11 个元素模板。加新 slide 类型只需在 normalizeToTag 加一行 TYPE_MAP 映射。

**踩坑：**
- 封面/过渡页文字变黑色——旧模板手动设 `color:#fff`，tag 系统的 `TAG_STYLE` 默认色是黑色。修复：深色背景类型强制 `color:'FFFFFF'`
- 目录页序号全变"1."——bindList 的前缀写死 `'1. '`。修复：改成 `(i+1)+'. '`
- 标题重复出现——第一级 H2 既是 page title 又是 content block。修复：`_skip` 标记去重

## 第 5 轮：render/ 模块化拆分

**改动：** `render.js`（414 行单体）→ 4 文件

```
render/
  assemble.js        ← renderAll: blocks → slides → ppt-data
  blocks.js          ← renderBlocks + 7 bind* → _html + _ppt + rect
  slides.js          ← renderSlide + Stack/Split/Grid/TagSlide → ast._html
  ppt-data.js        ← buildSlideData + IMAGE/DARK 常量 → ast._slideData
```

**关键决策：** `build-slide-data.js` 并入 render/，因为它是 render 产出的一部分——把散在 block 上的 `_ppt` + `rect` 收拢成 SLIDE_DATA JSON。不应该独立一个文件。

**数据流清晰化：**
```
assemble.js renderAll(ast):
  ① blocks.renderBlocks()  → block._html + block._ppt + block.rect
  ② slides.renderSlide()   → ast._html
  ③ ppt-data.buildSlide()  → ast._slideData
```

## 第 6 轮：Layout 独立成层

**改动：** `render/layout/` → `core/layout/`

**层级关系：**
```
layout ──→ render ──→ html-engine（ast._html）
                  ──→ ppt-engine（ast._slideData）
```

Layout 做纯计算（补默认值 + 算坐标），Render 调模板生成数据。Layout 服务于 Render，Render 服务于两个引擎。

**layout/ 也模块化：**
```
layout/
  assemble.js        ← applyLayout
  style.js           ← fillStyleDefaults
  height.js          ← textLines, itemHeight, blockHeight
  positions.js       ← stackPositions, splitPositions, gridPositions
```

## 最终架构总览

```
content.md
    │
    ▼
parser/assemble.js → SlideAST (tag 格式)
    │
    ▼
layout/assemble.js → style + 英寸坐标
    │
    ▼
render/assemble.js → _html + _ppt + rect + ast._html + ast._slideData
    │
    ├──→ html-engine/assemble.js → slides.html
    └──→ ppt-engine/assemble.js  → <script> executeBlock → .pptx
```

## 核心经验

1. **先设计数据流，再决定模块边界。** 不是文件夹改个名就是重构，要看数据从哪来、到哪去。
2. **"一个文件生成一个东西"比"一个文件生成半成品、另一个文件收拢"清晰。** render.js 生成 `_ppt` 散在 block 上 + build-slide-data.js 收拢 = 绕；renderAll 直接输出 `_html` + `_slideData` = 直。
3. **死代码要及时清。** `fitChars`/`truncText` 是旧 ppt* 函数的遗物，无人调用但不删就占着导出不放。`styleToHtml` 在流模式下完全用不到，8 个元素模板各有一半代码是死分支。
4. **两条路径统一是最大收益。** markdown→tag 后删了 23 个模板 + 3 个 registry 文件，维护负担大幅下降。
5. **PPT 引擎的 chart 和 waterfall 无法走 executeBlock。** chart 需要 `pptx.charts.PIE`（原生 OOXML API），waterfall 需要形状拼凑。这是合理的特殊路径，不需要强行统一。

---

## Meta-Templates 架构详解

### 结构（12 个 JS 文件）

```
meta-templates/
├── types/
│   └── ast.js                          ← SlideAST 工厂函数
└── elements/
    ├── shared/  escape.js  inline.js    ← 公共工具
    ├── text/    heading.js  paragraph.js  list.js  page-title.js
    ├── visual/  image.js  box.js
    └── data/    table.js  chart-shell.js  waterfall.js
```

### 唯一入口：render/blocks.js

所有 9 个元素模板只被 `render/blocks.js` 一个文件 import。每个 `bindXxx` 函数在流模式下调用元素模板生成 `block._html`，同时构建 `block._ppt` 描述符。

### 元素模板的工作方式：流模式

只输出纯内容 HTML（无外层定位 div），style 参数只传 font-size/color/bold/align，不传 x/y/w/h。

### 加新组件的流程

```
① ast.js              注册 block 工厂函数
② elements/xxx.js     写元素模板（流模式）
③ render/blocks.js    加 bindXxx + switch case
④ parser/normalize.js 加 TAG_STYLE 默认样式
```

### 布局的两层分工

- layout/positions.js — 纯计算：每个 block 应该在哪个位置（英寸）
- render/slides.js — HTML 包裹：英寸×96→px + div
- PPT 端直接用 block.rect（英寸），不走 slides.js
