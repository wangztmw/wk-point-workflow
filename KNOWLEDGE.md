# 项目经验文档

---

## PPT 导出技术总结（5 种底层方式）

本项目所有幻灯片导出统一走 PptxGenJS。按底层 API 的不同，分为 5 种技术：

### 技术 1：手动布局（text-layout）— addText + addShape

**覆盖 10 个模板**：title / content / summary / two-column / three-column / kpi-grid / toc / section / ending / quote / fallback

**原理**：在 10×5.625 英寸画布上，用 `slide.addText()` 和 `slide.addShape('rect')` 手动定位每个文字块和装饰形状。没有自动化布局——每个元素的 x/y/w/h 都是写死的坐标。

```js
slide.addText(s.title, { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
slide.addShape('rect', { x: 0.6, y: 0.9, w: 0.9, h: 0.06, fill: { color: '667eea' } });
```

**富文本**：Markdown 的 `**粗体**` 通过 `toRuns()` 转为 `[{text, options:{bold:true}}]` 数组，PptxGenJS 支持单格内多段文字不同格式。

**坐标计算**：所有坐标 = 英寸。16:9 幻灯片 = 10×5.625 英寸。Y 轴从上往下。

### 技术 2：原生 OOXML 图表（native-chart）— addChart

**覆盖 6 个模板**：chart-bar / chart-pie / chart-line / chart-radar / chart-pareto / chart-compare

**原理**：`slide.addChart()` 生成 `<c:chart>` 原生图表元素。不是图片，是真正的 PowerPoint 图表对象——双击打开内嵌数据表编辑数值。

```js
slide.addChart(pptx.charts.BAR, [
  { name: '产品A', labels: ['Q1','Q2','Q3'], values: [120, 145, 168] },
], { x: 0.6, y: 0.9, w: 8.8, h: 4.2, showValue: true, chartColors: ['4472C4'] });
```

**图表类型映射**：bar→BAR, line→LINE, pie→PIE, doughnut→DOUGHNUT, radar→RADAR

**限制**：PptxGenJS 不支持的图表类型（pareto、compare）降级为 bar。

### 技术 3：形状拼凑（waterfall）— addShape 逐根画

**覆盖 2 个模板**：chart-waterfall / chart-waterfall2

**原理**：PptxGenJS 没有 waterfall 图表类型，必须用 `addShape('rect')` 逐根柱子手动画。每根柱子的 y 和 h 通过累计值计算。虚线用 `addShape('line')`，标签用 `addText()`。

```js
slide.addShape('rect', { x: cx, y: barBottomY, w: barW, h: barH, fill: { color: '16A34A' } });
slide.addShape('line', { x: prevX, y: prevConnectY, w: stepX, h: 0, line: { color: '999999', width: 1, dashType: 'dash' } });
```

**关键细节**：
- 落地柱（起点/终点/合计）：从 y=0 画全高
- 浮动柱（增量/减量）：从 runningTotal 的位置开始，高度 = |delta|
- 连接线方向：增量在顶部平齐，减量在底部平齐
- Y 轴范围 = 中间累计最大值 × 1.08（排除首尾行）

### 技术 4：表格（table）— addTable + 单格边框

**覆盖 1 个模板**：table（三线表）

**原理**：`slide.addTable()` + 每格单独设置 `border: [上, 右, 下, 左]` 数组，实现顶线 3pt、表头下线 2pt、底线 3pt。

```js
slide.addTable(rows, { x: 0.5, y: 1.1, w: 9.0, border: { type: 'none' } });
// 表头格: border: [{pt:3}, N, {pt:2}, N]
// 最后行: border: [N, N, {pt:3}, N]
```

**踩坑**：border 只认数组格式 `[上,右,下,左]`，对象格式 `{top:...}` 被忽略。addTable 必须设 `border:{type:'none'}` 关闭默认全框。

### 技术 5：图片嵌入（image）— addImage

**覆盖 3 个模板**：image-text / image-full / image-grid

**原理**：`slide.addImage()` 将 base64 或 URL 图片嵌入 PPTX。全屏模式叠加半透明矩形模拟蒙版。

```js
slide.addImage({ data: s.imgSrc, x: 0.3, y: 0.5, w: 5.0, h: 4.6, sizing: { type: 'contain', w: 5.0, h: 4.6 } });
```

**注意**：`addImage` 必须用 try/catch 包裹（图片 URL 可能失效）。

---

### 总览表

| 技术 | PptxGenJS API | 模板数 | 特点 |
|------|--------------|:--:|------|
| 手动布局 | addText + addShape | 11 | 坐标写死，每个模板独立布局 |
| 原生图表 | addChart | 6 | OOXML 原生，双击编辑数据 |
| 形状拼凑 | addShape rect+line | 2 | 瀑布图专属，无原生支持 |
| 表格 | addTable | 1 | 单格 border 数组实现三线表 |
| 图片嵌入 | addImage | 3 | 支持 base64/URL |

### 已废弃

| 技术 | 原因 |
|------|------|
| **dom-to-pptx** | 无法处理 ECharts stack（瀑布塌缩）、foreignObject→位图化 |

### 数据流

```
SlideAST → extractAllSlideData() → SLIDE_DATA JSON → 嵌入 HTML
  → 浏览器 buildPptxFromSlideData() → 按 type 路由到 5 种技术
    → PptxGenJS 生成 .pptx
```

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

## 踩坑记录

### 坑 12：图片模板溢出——反复调试才对齐像素

图文模板（image-text、image-grid）多次出现内容溢出 slide 边界、底部文字被截断的问题。原因：没有严格按 960×540 像素预算计算各元素占用。

**最终解法：逐元素列像素预算**

slide 高度 540px，扣除 padding（上下各 40px = 80px）→ 可用内容区 460px。每个模板必须精确计算：

| 模板 | 元素 | 高度 | 累计 |
|------|------|------|------|
| image-text | padding-top | 40px |  |
| | 图片 max-height | 440px |  |
| | padding-bottom | 40px | 480px（< 540 ✅） |
| image-grid | padding-top | 36px | |
| | 标题+分隔线 | ~50px | |
| | 图片×2行 | 170×2=340px | |
| | 间距+标签 | 16+24=40px | |
| | padding-bottom | 36px | 502px（< 540 ✅） |

**教训**：
- 先算后写：在写 CSS 之前，把每个元素的高度列出来加总，确认不超过 540px
- `overflow:hidden` 是兜底，但不能替代精确计算——被 hidden 掉的内容用户看不到
- `height:540px;box-sizing:border-box` 强制锁定 slide 高度，防止 flex 子元素撑开
- 经过 3 次反复调试（溢出→缩小→再溢出→再缩小）才最终对齐，如果一开始就算好像素预算，一次就能过

### 坑 1：PptxGenJS cell border 只认数组，不认对象

设置 `border: { top: {...}, bottom: {...} }` 对象格式 → PptxGenJS **静默忽略**，走默认全框线。必须用数组 `[上, 右, 下, 左]`。

### 坑 2：addTable 全局 border 未关 → 全框线

`addTable` 不设 `border: { type: 'none' }` → PptxGenJS 给每格画默认边框，单格的 border 设置被覆盖。必须显式关闭全局边框。

### 坑 3：JSON.stringify 静默丢弃 Function

`JSON.stringify({ formatter: function(){} })` → `{}`，函数值被跳过不报错。formatter 和 renderItem 需要拆出来：数据用 JSON 传，函数在脚本里 `JSON.parse` 后手动补回。

### 坑 4：setOption 调用两次 → series 被整体替换

`chart.setOption({ series: [custom] })` 不是追加，是把之前的柱状系列全部替换。所有系列必须在同一次 `setOption` 中传入。

### 坑 5：模板字符串里的 `\` 转义链

Node.js 模板字符串（反引号）先处理 `\\` → `\`，输出的 HTML 里 `/\w+/` 变成 `/w+/`（`\` 丢了），浏览器 JS 解析失败。涉及多层转义时，用 `indexOf` + `substring` 代替正则。

### 坑 6：背景绘制顺序 → 盖住内容

PptxGenJS 后画的在上面。`drawBackgroundShapes` 放在内容**之后**调用 → 背景盖住内容。必须放在 `addSlide` 之后、`addText` 之前。

### 坑 7：SVG 全幅白色底板被提取为背景形状

SVG 的 `<rect width="960" height="540" fill="#f8f9fc"/>` 是画布底色，不应作为装饰元素。过滤规则：宽>900 且高>500 且颜色以 `#f` 开头的 rect 跳过。

### 坑 8：Markdown 粗体语法残留

`extractAllSlideData` 取 `item.text` 时包含 `**粗体**` 星号 → 导出的 PPTX 文字里带星号。需要用 `toRuns()` 把 inlineMarkup 转为 `[{text, options:{bold:true}}]` 富文本数组。

### 坑 9：渐变色的 fallback 颜色太亮

SVG 的 `fill="url(#g1)"` 无法解析 → `cleanColor` fallback 用 `4472C4`（亮蓝），实际应为 `0f3460`（深蓝）。遇到 `url(#...)` 时返回深色默认值。

### 坑 11：`--styleguide --open` 打开了 slides.html 而不是 styleguide.html

`--open` 固定打开 `slides.html`，但 `--styleguide` 生成的是 `styleguide.html`。结果浏览器打开 9 页 demo，看不到 22 页全量模板。

**修复**：`openInBrowser(name, file)` 加第二个参数，`--styleguide` 时传 `'styleguide.html'`。

### 坑 10：HTML 表格伪元素不可靠

`thead::before { display: table-row; }` 在不同浏览器行为不一致，顶线/底线只显示在第一列宽度。改用 `table { border-top/bottom }` 原生 CSS border。

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

1. `core/templates/<category>/` 创建 `xxx.js`
2. 导出 `{ render }` 函数，接收 `(ast, config)`
3. 在 `core/html-engine/index.js` 的 `TEMPLATE_REGISTRY` 注册
4. 在 `core/html-engine/index.js` 的 `extractAllSlideData()` 添加数据提取
5. 在 `core/html-engine/index.js` 的 `buildPptxFromSlideData()` 添加导出路由
6. 在 `core/ppt-engine/` 对应技术文件中添加导出函数
7. Markdown 用 `<!-- slide: type=xxx -->` 引用

---

## 项目调用结构（函数级完整版）

### 总览

```
content.md → parser → SlideAST → html-engine → slides.html → 浏览器导出 → ppt-engine → .pptx
```

### 第一层：parser — MD → AST

**文件**：`core/parser/index.js`

**入口**：`parse(markdownString)`

```
parse(md)
  ├── splitSlides(md)          按 --- 分割成原始块
  │
  └── for each 块:
        parseSlide(raw, index)
          ├── extractDirective()   提取 <!-- slide: type, key=value -->
          ├── parseContent(body)   解析正文
          │     ├── parseTable()       表格 → {headers, rows}
          │     ├── parseUnorderedList()  - 列表
          │     ├── parseOrderedList()   1. 列表
          │     ├── parseParagraph()     段落
          │     └── parseInline()        **粗体** *斜体* `代码`
          │
          └── 返回 { type, props, content:{headings,lists,table,blocks}, index }
```

**输出**：`SlideAST[]`

### 第二层：html-engine — AST → HTML

**文件**：`core/html-engine/index.js`

**入口**：`render(slides, config)`

```
render(slides, config)
  │
  ├── 1. mergeConfig()           合并用户配置 + 默认值
  ├── 2. loadTemplates()         加载 TEMPLATE_REGISTRY 中的 20 个模板
  ├── 3. loadBaseCSS()           读取 core/templates/base.css
  ├── 4. generateThemeCSS()      生成 CSS 变量
  │
  ├── 5. for each SlideAST:
  │       resolveTemplateName(ast)     chart + chartType → chart-xxx
  │       templates[name].render(ast)  调用模板函数 → HTML 片段
  │
  ├── 6. extractAllSlideData(slides)   遍历 AST 提取 SLIDE_DATA JSON
  │       ├── type='title'     → { title, subtitle }
  │       ├── type='content'   → { title, items:[{text,runs}], subHeadings }
  │       ├── type='summary'   → { title, cards:[{title,items}] }
  │       ├── type='chart'     → { chartType, categories, series }
  │       ├── type='table'     → { headers, rows }
  │       └── ...（20 种类型各有分支）
  │       └── toRuns(inlineMarkup)  粗体斜体 → PptxGenJS runs
  │
  └── 7. buildDocument({slidesHTML, slideData, ...})
          ├── 嵌入 ECharts + PptxGenJS CDN <script>
          ├── 嵌入 base.css + 主题 CSS
          ├── 嵌入 slidesHTML（所有 slide div）
          ├── 嵌入 SLIDE_DATA JSON
          ├── 嵌入 BACKGROUND_CONFIG（如有）
          └── 嵌入 <script> 导出逻辑（ppt-engine 的 5 种技术）
```

**输出**：`slides.html`

### 第三层：templates — 模板渲染

**文件夹**：`core/templates/`

每个模板的 `render(ast, config)` 返回 HTML 字符串：

```
core/templates/layouts/
  title.js         render() → 渐变背景 + 居中大字
  content.js       render() → 标题 + 2px分隔线 + 列表（按blocks顺序）
  summary.js       render() → 3张卡片网格 + 彩色左边框
  two-column.js    render() → 左右分栏 + 中间竖线 + 编号前缀
  three-column.js  render() → 三栏 + 彩色编号圆圈
  kpi-grid.js      render() → 2×2 大数字KPI卡片
  toc.js           render() → 编号目录列表
  section.js       render() → 深色全屏过渡 + 居中标题
  ending.js        render() → 渐变背景致谢页

core/templates/charts/
  chart-bar.js     render() → ECharts bar + SVG renderer
  chart-pie.js     render() → ECharts doughnut + SVG
  chart-line.js    render() → ECharts line + smooth + area fill
  chart-radar.js   render() → ECharts radar + polygon
  chart-pareto.js  render() → ECharts bar+line 双Y轴 80/20 标记线
  chart-compare.js render() → ECharts grouped bar + delta ↑↓标注
  chart-waterfall.js    render() → ECharts stack(透明底座) + custom 水平线
  chart-waterfall2.js   render() → ECharts stack + 落地柱 + 分段累计

core/templates/contents/
  table.js         render() → 三线表 HTML（border-top/bottom 3px）
  quote.js         render() → 居中引用 + 出处
  images/image-text.js  render() → 左图右文 flex 分栏
  images/image-full.js  render() → 全屏背景图 + 渐变蒙版
  images/image-grid.js  render() → CSS Grid 2×2 图矩阵
```

### 第三层（续）：ppt-engine — SLIDE_DATA → PPTX

**文件夹**：`core/ppt-engine/`

浏览器点击导出按钮后执行。5 种底层技术：

```
exportDomToPptx()
  → exportHybridPptx()
    → buildPptxFromSlideData()          ← ppt-engine/index.js 调度器
        │
        ├── s.type='title'              → addTitleSlidePptx()       ← text-layout
        ├── s.type='content'            → addContentSlidePptx()     ← text-layout
        ├── s.type='summary'            → addSummarySlidePptx()     ← text-layout
        ├── s.type='two-column'         → addTwoColumnSlidePptx()   ← text-layout
        ├── s.type='three-column'       → addThreeColSlidePptx()    ← text-layout
        ├── s.type='kpi-grid'           → addKpiGridSlidePptx()     ← text-layout
        ├── s.type='toc'                → addTocSlidePptx()         ← text-layout
        ├── s.type='section'            → addSectionSlidePptx()     ← text-layout
        ├── s.type='ending'             → addEndingSlidePptx()      ← text-layout
        ├── s.type='quote'              → addQuoteSlidePptx()       ← text-layout
        ├── s.type='fallback'           → addFallbackSlidePptx()    ← text-layout
        │
        ├── s.type='chart'
        │     ├── waterfall/waterfall2  → addWaterfallShapes()      ← waterfall
        │     └── bar/pie/line/...      → addNativeChartSlide()     ← native-chart
        │
        ├── s.type='table'              → addTableSlidePptx()       ← table
        │
        ├── s.type='image-text'         → addImageTextSlidePptx()   ← image
        ├── s.type='image-full'         → addImageFullSlidePptx()   ← image
        └── s.type='image-grid'         → addImageGridSlidePptx()   ← image
```

| ppt-engine 文件 | 底层 API | 模板数 |
|----------------|---------|:--:|
| text-layout.js | addText + addShape('rect') | 11 |
| native-chart.js | slide.addChart() | 6 |
| waterfall.js | addShape('rect') + addShape('line') | 2 |
| table.js | addTable + cell border 数组 | 1 |
| image.js | slide.addImage() | 3 |

### builder — CLI 调度

**文件**：`core/builder/index.js`

```
node core/builder/index.js <project> [--watch] [--theme] [--styleguide]

main()
  ├── --styleguide  → generateStyleguide()
  │     ├── require('./styleguide-data')  → 22 个示例 AST
  │     └── render(samples, config)       → styleguide.html
  │
  └── 普通构建      → buildProject(name)
        ├── fs.readFile(content.md)
        ├── parse(md)               ← 调用 core/parser
        ├── render(slides, config)  ← 调用 core/html-engine
        ├── 检测 assets/ 背景图 → styler 提取 → bg.json 缓存
        └── fs.writeFile(output/slides.html)
```

---

## HTML 引擎和 PPT 引擎如何保持一致

### 现状：人工对齐，没有自动保证

两者的唯一共同点是 **SLIDE_DATA**（内容一致）。布局和样式各自写死：

```
SLIDE_DATA
    │
    ├──▶ templates/content.js        padding:48px 70px, 标题24px
    │         ↓ HTML 预览
    │
    └──▶ ppt-engine/text-layout.js   x:0.6, y:0.4, fontSize:22
              ↓ PPTX 导出
```

### 三条约定

1. **同一个数据源**：HTML 和 PPTX 都从 `SLIDE_DATA` 取数据，内容天然一致
2. **同一个模板类型**：`buildPptxFromSlideData()` 的 switch-case 和 `TEMPLATE_REGISTRY` 的映射同构——20 种 type 一一对应
3. **人工对齐坐标**：HTML 用 CSS px，PPTX 用英寸坐标。没有换算公式，靠开发时反复调试对齐

### 如果要彻底解决

需要一个共享的布局描述层（spec），HTML 渲染器和 PPTX 渲染器都从 spec 读取参数而非各自写死：

```js
// templates/content/spec.js
module.exports = {
  title:    { fontSize: 22, x: 0.6, y: 0.4 },
  divider:  { width: 0.7, height: 2, color: '#1a1a1a' },
  items:    { fontSize: 13, x: 0.8, lineHeight: 1.9 },
};
```

改一处 spec，HTML 和 PPTX 同步生效。这是下一步方向，当前靠 22 个模板各自对应同名的 PPTX 导出函数，人工保证一致。

---

## Markdown 控制了 HTML 的布局吗？

不完全是。Markdown 决定了**内容和顺序**，模板决定了**视觉布局**。

### Markdown 决定的部分

```markdown
## 核心成果
- 第一条
- 第二条
### 关键里程碑
1. Q1 完成融资
```

Markdown 决定了：
- ✅ 标题是"核心成果"
- ✅ 有两个列表项
- ✅ 有序列表跟在 h3 后面
- ✅ blocks 数组保留了"标题→列表→次级标题→有序列表"的顺序

### 模板决定的部分

`templates/layouts/content.js` 决定了：
- ✅ 标题 24px，颜色 #1a1a1a
- ✅ 分隔线 2px 纯黑，48px 宽
- ✅ 列表项字体 17px，行高 1.9
- ✅ 左侧 padding 70px
- ❌ 这些你在 Markdown 里完全控制不了

**一句话**：Markdown = 这页有什么内容和结构。type 指令 = 用哪个模板。模板文件 = 这些内容长什么样。改 Markdown 的排布（比如把列表放在标题前面），HTML 会跟着变。但想改标题字号、分隔线粗细——得去改模板文件。

---

## 内容如何填入模板 + SlideAST 是合同

### 槽位填充模型

模板定义了"这页有一个标题槽、一个列表槽、一个次级标题槽"。Markdown 提供了具体内容：标题="核心成果"，列表=["第一条","第二条"]，次级标题="关键里程碑"。两者组合成完整页面。

```
模板说：           我有一个标题槽、一个列表槽、一个次级标题槽
Markdown 提供：    标题="核心成果"，列表=["第一条","第二条"]，次级标题="关键里程碑"
                      ↓
                 完整的页面
```

### 两者都遵循 SlideAST

`types/ast.md` 是规范文档，`core/parser/index.js` 是执行。parser 按规范产出 SlideAST，模板按规范消费 SlideAST。改了 SlideAST 的结构，parser 和所有模板都得同步改——所以它是二者之间的**合同**。

### 三层规范的关系

| 规范 | 约束谁 | 在哪 |
|------|--------|------|
| Markdown 写法 | 用户 → parser | `types/markdown.md` |
| SlideAST 结构 | parser → 模板 | `types/ast.md` |
| SLIDE_DATA 结构 | AST → PPTX 导出 | `types/slide-data.md` |
| 模板开发规范 | 开发者 | `types/template.md` |
