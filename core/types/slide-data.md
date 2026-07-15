# SLIDE_DATA 结构定义

`extractAllSlideData()` 从 SlideAST 提取、嵌入 HTML 的 JSON 数组。浏览器端 PptxGenJS 导出的唯一数据源。

## 通用字段（所有类型都有）

```js
{ index: number, type: string, title: string }
```

## 各类型的专有字段

### title
```js
{ index, type:'title', title, subtitle }
```

### toc
```js
{ index, type:'toc', title, items: string[] }
```

### section
```js
{ index, type:'section', title, subtitle }
```

### content
```js
{ index, type:'content', title, items: [{text, runs}], subHeadings: [{level, text}] }
// runs: PptxGenJS 富文本数组 [{text:'...', options:{bold:true}}]
```

### summary
```js
{ index, type:'summary', title, cards: [{title, items: [{text, runs}]}] }
```

### two-column
```js
{ index, type:'two-column', title, left: {title, items}, right: {title, items} }
```

### three-column
```js
{ index, type:'three-column', title, cols: [{title, items}] }  // 固定3栏
```

### kpi-grid
```js
{ index, type:'kpi-grid', title, kpis: [{label, value, trend}] }
```

### ending
```js
{ index, type:'ending', title, contact }
```

### chart
```js
{
  index, type:'chart', title,
  chartType: 'bar'|'pie'|'line'|'radar'|'pareto'|'compare'|'waterfall'|'waterfall2',
  categories: string[],    // X轴标签
  series: [{name, values: number[]}]  // 数据系列
}
```

### table
```js
{ index, type:'table', title, headers: string[], rows: string[][] }
```

### quote
```js
{ index, type:'quote', quote, author }
```

### image-text
```js
{ index, type:'image-text', title, items: [{text, runs}], imgSrc: 'data:...' }
```

### image-full
```js
{ index, type:'image-full', title, subtitle, imgSrc: 'data:...' }
```

### image-grid
```js
{ index, type:'image-grid', title, imgSrcs: string[], labels: string[] }
```

## 数据流

```
SlideAST.content
  → extractAllSlideData()
    → 遍历 ast.content.headings/lists/table/images
    → 按 ast.type 提取不同字段
    → 内联标记通过 toRuns() 转为 PptxGenJS runs
  → JSON.stringify()
  → 嵌入 <script>var SLIDE_DATA = [...]</script>
  → 浏览器 buildPptxFromSlideData() 读取
```
