# SlideAST 结构定义

parser 输出的结构化数据，是 renderer 的唯一输入源。

## 顶层结构

```js
// parser.parse(markdownString) → SlideAST[]
[
  { type, props, content, index },  // 第1页
  { type, props, content, index },  // 第2页
  ...
]
```

## SlideAST 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `type` | string | ✅ | 幻灯片类型，决定用哪个模板 |
| `props` | object | ✅ | 来自 `<!-- slide: -->` 注释的属性 |
| `content` | SlideContent | ✅ | 解析后的 Markdown 内容 |
| `index` | number | ✅ | 0-based 序号 |

## type 枚举（20 种）

| type | 模板文件 | 说明 |
|------|---------|------|
| `title` | layouts/title | 封面页 |
| `toc` | layouts/toc | 目录页 |
| `section` | layouts/section | 过渡页 |
| `content` | layouts/content | 文字页 |
| `summary` | layouts/summary | 总结卡片 |
| `two-column` | layouts/two-column | 两栏布局 |
| `three-column` | layouts/three-column | 三栏卡片 |
| `kpi-grid` | layouts/kpi-grid | KPI 概览 |
| `ending` | layouts/ending | 结束页 |
| `chart` | charts/chart-* | 图表（由 `props.chartType` 决定具体模板） |
| `table` | contents/table | 三线表 |
| `quote` | contents/quote | 引用页 |
| `image-text` | contents/images/image-text | 左右图文 |
| `image-full` | contents/images/image-full | 全屏图文 |
| `image-grid` | contents/images/image-grid | 图片矩阵 |

## props 字段

来自 `<!-- slide: type, key=value -->` 的键值对。常用：

| key | 适用 type | 说明 |
|-----|----------|------|
| `title` | 所有 | 幻灯片标题（如未指定则从 h1/h2 提取） |
| `chartType` | chart | 图表子类型：bar/pie/line/radar/pareto/compare/waterfall/waterfall2 |
| `theme` | title | dark/light/gradient |
| `subtitle` | section | 副标题 |

## SlideContent 字段

```js
{
  headings:   [],   // [{ level:1|2|3|4, text:'...' }]
  paragraphs: [],   // [{ type:'paragraph', text:'...', inlineMarkup:[...] }]
  lists:      [],   // [{ type:'list', ordered:bool, items:[{text,inlineMarkup}] }]
  table:      null, // { headers:[], rows:[[]] }  或 null
  images:     [],   // [{ alt:'', src:'' }]
  blocks:     [],   // ★ 保留原始顺序: [{type:'heading'|'list'|'paragraph'|'image'|'table', data:{...}}]
  raw:        '',   // 原始 Markdown 文本
}
```

## chart 类型的 chartType 枚举

| chartType | 模板文件 | 数据要求 |
|-----------|---------|---------|
| `bar` | charts/chart-bar | 表格 ≥2 列，第1列=类别，其余=系列 |
| `pie` | charts/chart-pie | 表格 2 列，第1列=标签，第2列=数值 |
| `line` | charts/chart-line | 同 bar |
| `radar` | charts/chart-radar | 同 bar，第1列=维度名 |
| `pareto` | charts/chart-pareto | 同 pie，自动降序+累计% |
| `compare` | charts/chart-compare | 表格 3 列，第1列=指标，2-3列=两期数据 |
| `waterfall` | charts/chart-waterfall | 表格 2 列，第1行=起点，末行=终点，中间=增减 |
| `waterfall2` | charts/chart-waterfall2 | 同 waterfall，行名含"合计"→ 落地柱 |
