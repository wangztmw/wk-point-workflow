# 项目经验文档

---

## 导出技术路线总览

本项目 Markdown → PPT 的导出统一使用 **PptxGenJS 数据驱动** 方式。HTML 是预览载体兼数据源——构建时把全部 slide 结构数据（`SLIDE_DATA`）以 JSON 嵌入 HTML，浏览器导出按钮读取 JSON 调用 PptxGenJS 生成 PPTX。

### 技术路线表

| 幻灯片类型 | 导出技术 | 效果 |
|-----------|---------|------|
| **title（封面）** | PptxGenJS | `slide.background` 深色背景 + `addText` 居中大字标题 |
| **content（内容）** | PptxGenJS | `addText` 富文本（`toRuns()` 保留粗体/斜体）+ `addShape` 分隔线 |
| **summary（总结）** | PptxGenJS | `addShape('rect')` 卡片背景 + 彩色左边框 + `addText` 标题和列表 |
| **two-column（两栏）** | PptxGenJS | 左右两个 `addShape('rect')` 分区 + 各含独立标题和列表 |
| **chart-bar/pie/line/radar** | PptxGenJS `addChart()` | **原生 OOXML 图表**。每根柱子/扇区独立可选，双击弹出内嵌数据表编辑数值 |
| **chart-pareto/compare** | PptxGenJS `addChart()` | 同上，原生图表。帕累托图降级为柱状图导出 |
| **chart-waterfall/waterfall2** | PptxGenJS 形状拼凑 | 每根柱子 = 独立 `addShape('rect')`，虚线 = `addShape('line')`，标签 = `addText`。可自由拖拽/改色/缩放，但无内嵌数据表 |
| **非图表页的富文本** | PptxGenJS `toRuns()` | 粗体 `**text**` → `{text, options:{bold:true}}`，斜体同理。保留 Markdown 语义 |

### 已废弃的技术

| 技术 | 原因 |
|------|------|
| **dom-to-pptx** | HTML DOM → PPTX 方式。文本/CSS 保留度高，但无法处理 ECharts stack 图表（瀑布图塌缩）、foreignObject 导致位图化。已被 PptxGenJS 数据驱动方式取代。CDN 仍加载但不再主动调用。 |

### 核心技术代码

#### 0. 富文本转换（Markdown 内联标记 → PptxGenJS runs）

```js
function toRuns(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [{ text: '', options: {} }];
  var runs = [];
  nodes.forEach(function(n) {
    if (n.type === 'text')       runs.push({ text: n.value, options: {} });
    if (n.type === 'bold')       n.content.forEach(function(c) { runs.push({ text: c.value, options: { bold: true } }); });
    if (n.type === 'italic')     n.content.forEach(function(c) { runs.push({ text: c.value, options: { italic: true } }); });
    if (n.type === 'code')       runs.push({ text: n.value, options: { fontFace: 'Courier New', color: '666666' } });
  });
  return runs;
}
```

#### 1. 封面页

```js
function addTitleSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.background = { fill: '1a1a2e' };
  slide.addText(s.title, { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  slide.addText(s.subtitle, { x: 0.5, y: 2.6, w: 9, h: 0.6, fontSize: 18, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei' });
}
```

#### 2. 内容页（富文本列表 + 分隔线）

```js
function addContentSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.addText(s.title, { x: 0.6, y: 0.4, w: 8.8, h: 0.5, fontSize: 22, bold: true, color: '333333' });
  slide.addShape('rect', { x: 0.6, y: 0.9, w: 0.9, h: 0.06, fill: { color: '667eea' } });
  var y = 1.25;
  s.items.forEach(function(item) {
    // 富文本：箭头 + 粗体保留
    var runs = [{ text: '▸  ', options: { color: '667eea' } }].concat(item.runs);
    slide.addText(runs, { x: 0.8, y: y, w: 8.4, h: 0.32, fontSize: 13, color: '444444' });
    y += 0.3;
  });
}
```

#### 3. 总结页（卡片网格 + 彩色左边框）

```js
function addSummarySlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '333333' });
  var cols = s.cards.length <= 2 ? 2 : 3;
  var cardW = 8.6 / cols, cardH = 4.0, cardY = 0.95;
  s.cards.forEach(function(card, i) {
    var cx = 0.5 + i * (cardW + 0.2);
    // 卡片背景
    slide.addShape('rect', { x: cx, y: cardY, w: cardW, h: cardH, fill: { color: 'F5F7FF' }, rectRadius: 0.08 });
    // 彩色左边框 (⚠=黄, ✅=绿, 默认蓝)
    var c = /⚠|关注|挑战/.test(card.title) ? 'FFC000' : (/✅|达成|计划|优势/.test(card.title) ? '70AD47' : '4472C4');
    slide.addShape('rect', { x: cx, y: cardY, w: 0.06, h: cardH, fill: { color: c } });
    // 标题 + 列表
    slide.addText(card.title, { x: cx + 0.2, y: cardY + 0.12, w: cardW - 0.3, h: 0.35, fontSize: 14, bold: true, color: '333333' });
    var iy = cardY + 0.55;
    card.items.forEach(function(item) {
      var runs = [{ text: '• ', options: { color: '667eea' } }].concat(item.runs);
      slide.addText(runs, { x: cx + 0.25, y: iy, w: cardW - 0.4, h: 0.28, fontSize: 10, color: '555555' });
      iy += 0.25;
    });
  });
}
```

#### 4. 原生 OOXML 图表（柱/饼/线/雷达）

```js
function addNativeChartSlide(pptx, info) {
  var slide = pptx.addSlide();
  var ct = info.chartType || 'bar';
  var typeMap = { bar: 'BAR', line: 'LINE', pie: 'PIE', doughnut: 'DOUGHNUT', radar: 'RADAR' };
  slide.addText(info.title, { x: 0.5, y: 0.3, w: 9, h: 0.45, fontSize: 20, bold: true, color: '333333' });
  var chartData = info.series.map(function(s) {
    return { name: s.name, labels: info.categories, values: s.values };
  });
  slide.addChart(pptx.charts[typeMap[ct]], chartData, {
    x: 0.6, y: 0.9, w: 8.8, h: 4.2,
    showLegend: info.series.length > 1 || ct === 'pie',
    showValue: true, dataLabelPosition: 'outEnd',
    chartColors: ['4472C4','ED7D31','70AD47','FFC000'],
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });
  slide.addText('✅ 原生 OOXML 图表 — 双击可编辑数据表', { x: 0.6, y: 5.2, w: 8.8, h: 0.25, fontSize: 8, color: '2ecc71' });
}
```

#### 5. 瀑布图形状拼凑（每根柱子 = 独立矩形）

```js
function addWaterfallShapes(pptx, info) {
  var slide = pptx.addSlide();
  var chartX = 0.8, chartW = 8.5, chartY = 1.0, chartH = 4.2;
  var vals = info.series[0].values, cats = info.categories;
  // ... 计算 maxAbs、stepX、barW ...

  var runningTotal = vals[0], prevConnectY = 0;
  for (var i = 0; i < cats.length; i++) {
    var isFirst = (i === 0), isLast = (i === cats.length - 1);
    var isSub = /合计|小计|汇总|总计/.test(cats[i]);   // 中间合计柱
    var val = vals[i], cx = chartX + i * stepX + gapX;

    if (isFirst || isLast || isSub) {
      // 落地柱：从 y=0 开始的全高矩形
      barBottomY = yPos(val); barH = toY(val);
      barColor = isFirst ? '4472C4' : (isSub ? '8B5CF6' : 'ED7D31');
      if (isSub) runningTotal = val;
    } else {
      // 浮动柱
      var delta = val;
      if (delta >= 0) {
        barBottomY = yPos(runningTotal + delta); barH = toY(delta); barColor = '70AD47';
      } else {
        barBottomY = yPos(runningTotal); barH = toY(Math.abs(delta)); barColor = 'ED7D31';
      }
      runningTotal += delta;
    }
    // 画柱子
    slide.addShape('rect', { x: cx, y: barBottomY, w: barW, h: barH, fill: { color: barColor }, rectRadius: 0.04 });
    // 画标签
    slide.addText(isFirst || isLast ? String(val) : (val >= 0 ? '+' + val : String(val)),
      { x: cx, y: barBottomY - 0.22, w: barW, h: 0.2, fontSize: 9, align: 'center', bold: true });
    // 画虚线连接（增/落地柱连顶部，减量柱连底部）
    var connectY = (delta >= 0 || isFirst || isLast || isSub) ? barBottomY : (barBottomY + barH);
    if (i > 0) slide.addShape('line', { x: prevX, y: prevConnectY, w: stepX, h: 0, line: { color: '999999', width: 1, dashType: 'dash' } });
    prevConnectY = connectY;
    // X 轴标签
    slide.addText(cats[i], { x: cx, y: chartY + chartH + 0.04, w: barW + 0.4, h: 0.22, fontSize: 8, align: 'center', color: '666666' });
  }
  // 横轴基准线 + 竖轴左边线 + Y 轴刻度
  slide.addShape('line', { x: chartX, y: yPos(0), w: chartW, h: 0, line: { color: '999999', width: 1.2 } });
  slide.addShape('line', { x: chartX, y: chartY, w: 0, h: chartH, line: { color: '999999', width: 1.2 } });
}
```

#### 6. 统一调度入口

```js
function buildPptxFromSlideData() {
  var pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'C16x9', width: 10, height: 5.625 });
  pptx.layout = 'C16x9';
  SLIDE_DATA.forEach(function(s) {
    if (s.type === 'title')           addTitleSlidePptx(pptx, s);
    else if (s.type === 'content')    addContentSlidePptx(pptx, s);
    else if (s.type === 'summary')    addSummarySlidePptx(pptx, s);
    else if (s.type === 'two-column') addTwoColumnSlidePptx(pptx, s);
    else if (s.type === 'chart') {
      if (s.chartType === 'waterfall' || s.chartType === 'waterfall2') addWaterfallShapes(pptx, s);
      else addNativeChartSlide(pptx, s);
    }
    else addFallbackSlidePptx(pptx, s);
  });
  return pptx;
}
```

---

## 经验记录

---

## 经验 1：ECharts 复杂图表（stack/transparent）→ dom-to-pptx 导出失败

### 问题

瀑布图使用 ECharts 的 `stack` 机制——在浮动柱子下面垫透明底座来实现"悬空"效果。浏览器预览正常，但 dom-to-pptx 导出到 PPTX 后所有柱子塌缩到底部，透明底座丢失。

**根因**：dom-to-pptx 提取 SVG 时，把每个 `<rect>` 当作独立元素处理，不识别 ECharts 的 stack 关系。透明底座的 `fill="transparent"` 可能被跳过或位置错乱。

**影响范围**：瀑布图（`waterfall`）、分段瀑布图（`waterfall2`）+ 任何使用 stack 的 ECharts 图表。

### 解决方案：形状拼凑（Shape Decomposition）

对于无法走 dom-to-pptx 的图表类型，用 PptxGenJS 的 `addShape('rect')` / `addShape('line')` / `addText()` 手动构建每个图表元素。每根柱子 = 独立矩形，虚线连接累计值，标签手动定位。

### 实施位置

`core/renderer/index.js` 中的浏览器导出逻辑：

```
渲染时: extractChartData() → SLIDE_CHART_DATA JSON → 嵌入 HTML
导出时: isWaterfallType() 检测 → addWaterfallShapes() 手动构建
```

### 关键代码模式

```js
function isWaterfallType(type) {
  return type === 'waterfall' || type === 'waterfall2';
}
if (hasWaterfall()) {
  await exportHybridPptx();  // 混合模式
  return;
}
await domToPptx.exportToPptx(slides, options);  // 正常路径
```

---

## 瀑布图导出规范（Shape Decomposition 标准）

### 柱子类型与绘制规则

| 柱子类型 | 判定条件 | 画法 | 颜色 |
|---------|---------|------|------|
| **起点柱** | `i === 0` | 从 y=0 开始的全高矩形 | `4472C4` 蓝 |
| **终点柱** | `i === catCount - 1` | 从 y=0 开始的全高矩形 | `ED7D31` 橙 |
| **合计柱** | 名称含 `合计/小计/汇总/总计` | 从 y=0 开始的全高矩形，并重置累计起点 | `8B5CF6` 紫 |
| **增量柱** | `delta > 0` | 浮动矩形，底部 = 上一个累计值，高度 = delta | `70AD47` 绿 |
| **减量柱** | `delta < 0` | 浮动矩形，底部 = 新累计值，高度 = abs(delta) | `ED7D31` 红 |

### 水平连接线规则

连接线从上一个柱子的平齐点水平延伸到当前柱子的对应位置：

| 上一柱类型 | 连接点 |
|-----------|--------|
| 起点柱 / 终点柱 / 合计柱 | 柱**顶部** |
| 增量柱 | 柱**顶部**（新的累计值在顶部） |
| 减量柱 | 柱**底部**（新的累计值在底部） |

```js
if (isFirst || isLast || isSub)  connectY = barBottomY;        // 顶部
else if (val >= 0)               connectY = barBottomY;        // 顶部
else                             connectY = barBottomY + barH; // 底部
```

### 坐标轴

| 元素 | 是否画出 | 说明 |
|------|---------|------|
| 横轴基准线（y=0） | ✅ | `addShape('line')`，yPos(0)，横跨 chartW |
| 竖轴左边线 | ✅ | `addShape('line')`，从 chartY 到 chartY+chartH，x=chartX |
| Y 轴刻度数字 | ✅ | `addText()`，左侧对齐 |
| Y 轴背景网格线 | ❌ | 不画，保持简洁 |
| X 轴类别标签 | ✅ | `addText()`，柱子下方居中 |

### Y 轴范围计算

排除首尾行，只对中间增量/减量行累计，取累计最大值。遇到合计行时重置累计。余量 +8%：

```js
var cumVal = vals[0], cumMax = cumVal;
for (var j = 1; j < vals.length - 1; j++) {
  if (isSubtotalRow(cats[j])) { cumVal = vals[j]; continue; }  // 合计行重置
  cumVal += vals[j];
  if (cumVal > cumMax) cumMax = cumVal;
}
maxAbs = Math.ceil(cumMax * 1.08);  // 8% 余量，不是 15%
```

### Markdown 数据约定

- 第一行 = 起点值（如 `300`）
- 最后一行 = 终点值（如 `445`）
- 中间行：`+150` 表示增加，`-80` 表示减少
- 名称含 `合计/小计/汇总/总计` 的行自动识别为合计柱

---

## 经验 2：`setOption` 多次调用会覆盖 series

### 问题

`chart.setOption({series: [customSeries]})` 不是追加，是**完全替换**所有系列。柱子全消失。

### 解决

`JSON.parse` 解析数据 → 手动补回 formatter 函数 → `opt.series.push(customSeries)` → 一次 `chart.setOption(opt)`。

### 关键教训

- `JSON.stringify` 会静默丢弃所有 Function 值
- `setOption` 的 series 是整体替换，不是追加
- 正确做法：数据用 JSON 传，函数在脚本里补回，一次 setOption

---

## 经验 3：ECharts 文本渲染 → foreignObject 导致位图化

ECharts SVG 模式下默认用 `<foreignObject>` 嵌入 HTML 渲染富文本。dom-to-pptx 无法转换，整个 SVG 降级为位图。

**解决**：避免 `rich` 文本、HTML 标签、`overflow: break`，只用简单 fontSize/color/fontWeight。

---

## 经验 4：Markdown 表格 → 图表数据

- 第一列 = 类别标签，其余列 = 数据系列
- `<!-- slide: chart, type=xxx -->` 指定类型
- `+120`/`-45` 表示增减（瀑布图专用）
- 路径：`parseTable → content.table → extractChartData() → SLIDE_CHART_DATA JSON`

---

## 经验 5：模板注册流程

1. `core/renderer/templates/` 创建 `chart-xxx.js`
2. 导出 `{ render }` 函数，接收 `(ast, config)`
3. 在 `core/renderer/index.js` 的 `TEMPLATE_REGISTRY` 注册
4. Markdown 用 `<!-- slide: chart, type=xxx -->` 引用
5. 路由：`resolveTemplateName()` → `chart-${ct}` → 查找模板
