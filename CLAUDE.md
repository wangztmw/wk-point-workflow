# CLAUDE.md

> Markdown → HTML → PPT 三层幻灯片生成系统。本文档给 Claude 看，也给人看。

## 一句话

把 Markdown 变成带图表的 PPT。写 `content.md` → 跑 `node core/builder/index.js <项目名>` → 浏览器预览 + 一键导出 PPTX。

## 架构

```
content.md         你写的（HTML注释标注类型 + Markdown内容）
    │  parser/
    ▼
SlideAST[]         结构化幻灯片数据（类型、标题、图片、表格、列表）
    │  html-engine/ + templates/
    ▼
slides.html        浏览器预览（ECharts 图表 + 导出工具栏）
    │  ppt-engine/（浏览器端 PptxGenJS）
    ▼
slides.pptx        最终交付（原生图表双击可编辑数据）
```

三层各司其职：parser 只管解析 → html-engine 只管渲染 → ppt-engine 只管导出。**模板是核心**——加新类型就是加模板文件。

## 快速开始

```bash
# 构建项目
node core/builder/index.js <项目名>

# 构建并在浏览器打开
node core/builder/index.js <项目名> --open

# 构建所有项目
node core/builder/index.js --all

# 监听模式（改 content.md 自动重建）
node core/builder/index.js --watch <项目名>

# 换主题
node core/builder/index.js <项目名> --theme dark    # dark / ocean / sunset
```

## 项目结构

```
projects/<项目名>/
  content.md         ← 你主要编辑这个
  config.json        可选，覆盖默认配置（主题、尺寸等）
  bg.json            可选，背景模板（自动从图片/SVG提取）
  assets/            可选，背景图/PPT模板放这里
  images/            图片资源（文件夹驱动，见下文）
    <标签名>/         子文件夹 = 一张图
  output/
    slides.html       生成结果
```

## 幻灯片类型（在 content.md 中用 HTML 注释声明）

```
<!-- slide: type, key=value -->     ← 声明类型和属性
# 标题                              ← 正文用 Markdown
内容...
---
```

### 全部 21 种类型

#### 页面布局（layouts/）
| 类型 | 用途 | 写法 |
|------|------|------|
| `title` | 封面 | `<!-- slide: title, theme=gradient -->` + H1 + H2 |
| `content` | 通用内容 | H1 标题 + 列表 |
| `summary` | 卡片总结 | H3 → 卡片，列表 → 卡片内容 |
| `two-column` | 两栏 | 前一半列表 → 左栏，后一半 → 右栏 |
| `three-column` | 三栏 | 同上分三栏 |
| `toc` | 目录 | H2+ → 目录项 |
| `section` | 分隔页 | H1 大标题 + H2 副标题 |
| `ending` | 结束页 | H1 + 段落文字 |
| `kpi-grid` | KPI 仪表盘 | 表格：标签/值/趋势，最多4个 |

#### 图表（charts/）
| 类型 | 用途 |
|------|------|
| `chart, type=bar` | 柱状图 |
| `chart, type=pie` | 饼图 |
| `chart, type=line` | 折线图 |
| `chart, type=radar` | 雷达图 |
| `chart, type=pareto` | 帕累托图 |
| `chart, type=compare` | 对比图 |
| `chart, type=waterfall` | 瀑布图 |
| `chart, type=waterfall2` | 分段瀑布图 |

图表数据用 Markdown 表格：
```markdown
<!-- slide: chart, type=bar, title=季度营收 -->
| 季度 | 收入 | 成本 |
|------|------|------|
| Q1   | 120  | 80   |
| Q2   | 145  | 90   |
```

#### 特殊内容（contents/）
| 类型 | 用途 |
|------|------|
| `table` | 三线表 |
| `quote` | 引用页 |

#### 图片类型（contents/images/）★ 文件夹驱动

| 类型 | 布局 |
|------|------|
| `image-gallery` | 自适应网格（2-4列），适合多图展示 |
| `image-grid` | 固定 2×2 或 2×3 网格 |
| `image-text` | 左图右文（图 55% + 文 45%） |
| `image-full` | 全屏出血图 + 文字叠加蒙版 |
| `timeline` | 垂直时间线（H3=节点，列表=详情，可选占位图） |

**图片类型的文件夹驱动模式（重点）：**

content.md 只写 H3 标签，**不放图片**：
```markdown
<!-- slide: image-gallery, title=六款主流AI眼镜 -->
### Meta-Ray-Ban
### Rokid-Glasses
### XREAL-Air-2
### 华为Vision-Glass
### 小米AI眼镜
### 理想-Livis
```

图片资源放在 `images/<标签名>/` 子文件夹：
```
images/
  Meta-Ray-Ban/
    产品照.jpg        ← 有图 → 自动渲染真实图片
  Rokid-Glasses/      ← 空文件夹 → 自动渲染占位框
  XREAL-Air-2/
    air2.webp         ← 支持 jpg/png/gif/webp/svg
```

**规则：**
- 有图 → HTML 和 PPT 都用真实图片
- 空文件夹 → 渲染虚线占位框，显示标签名和路径提示
- 不用管图片格式、不用转 base64，系统自动处理
- 这个模式适用于所有 4 种图片类型

## 模板文件（23个）

```
core/templates/
  layouts/          9 个页面布局
    title.html.js, content.html.js, summary.html.js,
    two-column.html.js, three-column.html.js, toc.html.js,
    section.html.js, ending.html.js, kpi-grid.html.js
  charts/           8 个图表
    chart-bar.html.js, chart-pie.html.js, chart-line.html.js,
    chart-radar.html.js, chart-pareto.js, chart-compare.js,
    chart-waterfall.js, chart-waterfall2.js
  contents/         6 个特殊内容
    table.html.js, quote.html.js, timeline.html.js
    images/  ← 4 个图片模板（文件夹驱动）
      image-gallery.js, image-grid.html.js,
      image-text.html.js, image-full.html.js
  base.css          全局基础样式
```

每个模板导出 `{ render(ast, config) → HTML字符串 }`。

## 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| parser | `core/parser/index.js` | Markdown → SlideAST（~250行，零依赖） |
| html-engine | `core/html-engine/index.js` | AST + 模板 → HTML + 导出脚本嵌入 |
| ppt-engine | `core/ppt-engine/` | 浏览器端 PptxGenJS 导出（6个.js拼接为 `<script>`） |
| builder | `core/builder/index.js` | CLI 构建工具 |
| styler | `core/styler/` | 背景提取（图片→base64，SVG→矢量图形） |

### ppt-engine 子模块（5种导出技术）

| 文件 | 技术 | 覆盖 |
|------|------|------|
| `text-layout.js` | addText + addShape 手动布局 | title/content/summary/两栏/三栏/ending/quote/KPI/图片 |
| `native-chart.js` | addChart 原生 OOXML | bar/pie/line/radar/pareto/compare |
| `waterfall.js` | addShape 逐根拼凑 | waterfall/waterfall2 |
| `table.js` | addTable 单格边框 | table |
| `image.js` | addImage 图片嵌入 | image-gallery/image-grid |

## 工作流

### 新建项目

```bash
mkdir -p projects/我的项目/images
```

创建 `projects/我的项目/content.md`：
```markdown
<!-- slide: title, theme=gradient -->
# 我的演示
## 副标题

---

<!-- slide: content -->
# 第一页
- 要点一
- 要点二

---

<!-- slide: ending -->
# 谢谢
```

```bash
node core/builder/index.js 我的项目 --open
```

### 加图片

1. 在 `images/` 下建子文件夹（文件夹名 = 标签名）
2. 把图片拖进去
3. content.md 里用图片类型 + H3 声明标签
4. 跑构建

### 加图表

1. 写 `<!-- slide: chart, type=bar, title=... -->`
2. 下面写 Markdown 表格
3. 跑构建 → ECharts 渲染 SVG，PPT 导出为原生图表

### 自定义配置

`config.json`：
```json
{
  "title": "自定义标题",
  "theme": {
    "primary": "#e94560",
    "bg": "#0d0d0d",
    "text": "#f0f0f0"
  },
  "chartColors": ["#e94560", "#667eea", "#2ecc71"]
}
```

## 关键约定

1. **模板即核心**：加功能先加模板，再适配 parser 和 ppt-engine
2. **SlideAST 是统一数据结构**：parser 输出、模板消费、ppt-engine 消费
3. **图片走文件夹**：不用 base64 塞 content.md，图片管理在 `images/<标签>/`
4. **图表数据走表格**：Markdown 表格 → chart 类型自动解析
5. **HTML 是预览也是导出载体**：ECharts 图表在 HTML 中渲染为 SVG，PptxGenJS 导出脚本嵌入 HTML
6. **所有坐标 = 英寸**：PPT 画布 10×5.625 英寸（16:9）
7. **PPT 导出统一走 PptxGenJS**：dom-to-pptx 已废弃（无法处理 ECharts 堆叠和 foreignObject）
8. **模板命名**：`chart-*` 类型根据 `props.chartType` 自动路由到对应模板

## 技术栈

- **Node.js**：parser、builder、html-engine（渲染时运行）
- **浏览器**：ECharts 5.5（图表渲染）、PptxGenJS 3.12（PPT 导出）
- **零前端框架**：模板拼 HTML 字符串，无 React/Vue
- **零 parser 依赖**：手写 Markdown 解析器 ~250 行

## 踩坑备忘

详见 `KNOWLEDGE.md`（1061行），这里列关键几条：
- PptxGenJS 的 border 只认数组 `[上,右,下,左]`，不认对象
- `addImage` 必须 try/catch 包裹
- `addTable` 必须设 `border:{type:'none'}` 关默认全框
- 瀑布图是形状拼的，不是原生图表
- dom-to-pptx 已废，原因：ECharts stack 塌缩 + foreignObject→位图
