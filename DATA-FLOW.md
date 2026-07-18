# 模块工作流程

## 构建阶段（Node.js）

```
                        ┌─────────────────────┐
                        │  core/builder/       │
                        │  index.js            │
                        │                     │
                        │  node core/builder   │
                        │  index.js <项目名>    │
                        └──────────┬──────────┘
                                   │
                   ① 读取 content.md + config.json
                   ② 判断语法类型（markdown / tag）
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    │
    markdown 语法             tag 语法                  │
    parse(md)              parseTag(md)                 │
              │                    │                    │
              ▼                    ▼                    │
┌─────────────────────────────────────────────────────────┐
│  core/parser/                                           │
│                                                         │
│  index.js            tag-parser.js                      │
│  ─────────           ─────────────                      │
│  --- 分页 → 逐页解析  <slide: type> → type + props      │
│  # ## ### → heading   <h1: text>  → block(tag=h1)       │
│  - item  → list       <list: >    → block(tag=list)     │
│  |表格|  → table       <chart: >   → block(tag=chart)   │
│                        属性解析    → block.style         │
│                                                         │
│  输出: SlideAST[]                                       │
│  [{ index, type, parser, props, content:{blocks, ...} }]│
└────────────────────────┬────────────────────────────────┘
                         │
                         │ SlideAST[]
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  core/html-engine/index.js  ← 编排中心                   │
│                                                         │
│  render(slides, config)                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 模板加载                                          │    │
│  │                                                  │    │
│  │ html-registry.js 的 TEMPLATE_MAP                 │    │
│  │ ───────────────────────────────                  │    │
│  │ 'chart'  → pages/charts/chart-bar.html.js        │    │
│  │ 'stack'  → layouts/stack-slide.js                │    │
│  │ 'content'→ pages/slides/content.html.js          │    │
│  │ ... 等 27 个映射                                  │    │
│  │                                                  │    │
│  │ 所有模板一次性 require → TEMPLATE_REGISTRY        │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 逐 slide 处理（一个 for 循环）                    │    │
│  │                                                  │    │
│  │ for (ast of slides) {                            │    │
│  │                                                  │    │
│  │   ① applyLayout(ast)                             │    │
│  │      └─→ layout-prerender/layout/layout-engine   │    │
│  │           ├─ fillStyleDefaults(每个 block)        │    │
│  │           │  补全 font-size/color/bold/align      │    │
│  │           │  保留原有属性(chartType等)             │    │
│  │           └─ stackPositions() / splitPositions()  │    │
│  │              / gridPositions()                    │    │
│  │              仅 layout slide 计算 x/y/w/h(英寸)   │    │
│  │                                                  │    │
│  │   ② preRender(blocks)                            │    │
│  │      └─→ layout-prerender/prerender/index        │    │
│  │           遍历 blocks                             │    │
│  │           查 element-registry 的 REGISTRY         │    │
│  │           REGISTRY[tag].html → 闭包绑定           │    │
│  │           block._html = function(style){...}      │    │
│  │                                                  │    │
│  │   ③ resolveImageFromFolders(ast, projectDir)     │    │
│  │      └─→ images/<label>/*.jpg → base64           │    │
│  │ }                                                │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ④ 模板渲染（第二次 for 循环）                     │    │
│  │                                                  │    │
│  │ for (ast of slides) {                            │    │
│  │   tplName = resolveTemplateName(ast)             │    │
│  │   template = TEMPLATE_REGISTRY[tplName]           │    │
│  │   template.render(ast, config) → HTML 字符串      │    │
│  │ }                                                │    │
│  │                                                  │    │
│  │ 两大渲染路径:                                     │    │
│  │                                                  │    │
│  │ A) 布局类 (stack/split/grid)                     │    │
│  │    └─→ html-layout.js                            │    │
│  │         英寸×96→像素                              │    │
│  │         block._html(pixelStyle) → 元素HTML        │    │
│  │         外层 <div> 绝对定位包裹                    │    │
│  │                                                  │    │
│  │ B) 内容类 (title/content/chart/... + tag-slide)  │    │
│  │    └─→ tag-renderer.js 或 对应页面模板             │    │
│  │         switch(block.tag) 或 模板内置逻辑          │    │
│  │         直接调 元素模板(heading/paragraph/...)     │    │
│  │         styleToHtml(style) → CSS绝对定位           │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ⑤ extractAllSlideData(slides, config)            │    │
│  │    └─→ types/ppt-extract.js                      │    │
│  │         PROJECTION[type]() 逐个投影               │    │
│  │         tag → projectTag(ast)                    │    │
│  │         chart → projectChart(ast)                │    │
│  │         content → projectContent(ast)            │    │
│  │         ...                                       │    │
│  │                                                    │    │
│  │  输出: SLIDE_DATA (纯 JSON 数组)                   │    │
│  │  将被嵌入 HTML 的 <script> 中                      │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ⑥ ppt-engine-assemble.generate(params)           │    │
│  │    └─→ types/element-registry.js (ppt 函数)      │    │
│  │         pptHeading.toString()                     │    │
│  │         pptChart.toString()    ← 源码转为字符串    │    │
│  │         ...                                       │    │
│  │                                                    │    │
│  │    拼接 7 段源码为一个 <script>:                   │    │
│  │      core.js         → pptx 初始化 + 工具函数     │    │
│  │      waterfall.js    → 瀑布图形状                 │    │
│  │      native-chart.js → 原生图表 (markdown路径)    │    │
│  │      text-layout.js  → 文字/形状手动布局          │    │
│  │      table.js        → 三线表                     │    │
│  │      image.js        → 图片嵌入                   │    │
│  │      engineUtils     → REGISTRY 浏览器端副本      │    │
│  │      tag-export.js   → 标签语法PPT导出            │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ⑦ 拼接输出                                        │    │
│  │     base.css + slidesHTML + PPT脚本 + 工具栏      │    │
│  │     → 写入 output/slides.html                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         │
                         │ slides.html
                         ▼
                  ┌──────────────┐
                  │  浏览器打开   │
                  └──────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌─────────┐   ┌──────────┐   ┌──────────┐
    │ 翻页预览 │   │ 导出PPTX │   │ ECharts  │
    │ CSS滚动  │   │          │   │ 动态渲染 │
    └─────────┘   └────┬─────┘   └──────────┘
                       │
                       │  buildPptxFromSlideData()
                       │  遍历 SLIDE_DATA 数组
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
    parser==='tag'            markdown 路径
    addTagSlidePptx()         slide.type 分发
            │                     │
            │  forEach block:     │  14 种类型:
            │  REGISTRY[tag]      │  title    → addTitleSlidePptx
            │   .ppt(slide,       │  content  → addContentSlidePptx
            │    data,style,      │  chart    → addNativeChartSlide
            │    rect [,pptx])    │  ...
            │                     │
            ├─ h1~h4             ├─ addText
            ├─ p/list            ├─ addText
            ├─ table             ├─ addTable
            ├─ img               ├─ addImage
            ├─ box               ├─ addShape
            └─ chart             └─ addChart (原生OOXML)
                 │
                 ▼
          pptx.writeFile()
                 │
                 ▼
          ┌──────────────┐
          │ slides.pptx  │
          └──────────────┘
```

## 模块职责一览

```
模块                        职责                          被谁调用
──────────────────────────────────────────────────────────────────────
builder/index.js            CLI 入口，读文件、调解析+渲染      用户命令行
parser/                     content.md → SlideAST[]          builder
  index.js                  markdown 语法解析
  tag-parser.js             tag 语法解析
types/                      类型定义 + 注册表（纯数据，无逻辑）
  ast.js                    SlideAST 工厂函数                parser
  element-registry.js       tag→{html,ppt} 注册表            html-layout, assemble
  html-registry.js          slide类型→模板路径                html-engine
  ppt-extract.js            AST→SLIDE_DATA 投影规则           html-engine
layout-prerender/           布局 + 预渲染（纯计算）
  layout/layout-engine.js   applyLayout, 位置计算, 默认值      html-engine
  prerender/index.js        preRender, _html 绑定             html-engine
html-engine/index.js        编排中心，调度所有步骤              builder
templates/                  模板文件（每种slide类型一个）
  layouts/html-layout.js    stack/split/grid HTML布局         html-engine
  tag-renderer.js           标签语法通用渲染器                 html-engine
  elements/**/*.js          元素级渲染(heading/list/...等)     html-layout, tag-renderer
  pages/**/*.js             页面模板(title/content/...等)     html-engine
ppt-engine/                 浏览器端 PPT 导出
  ppt-engine-assemble.js    脚本拼接（Node端运行）             html-engine
  core.js                   pptx 初始化 + 工具函数            浏览器
  tag-export.js             标签语法 PPT 导出                 浏览器
  native-chart.js           原生图表 (markdown 路径)          浏览器
  text-layout.js            文字/形状手动布局                 浏览器
  table.js                  三线表导出                        浏览器
  image.js                  图片嵌入导出                      浏览器
  waterfall.js              瀑布图形状拼凑                    浏览器
```

## 两个关键"分叉点"

```
分叉点 1: 模板选择（html-engine 内）
───────────────────────────────────
SlideAST.type ──→ resolveTemplateName() ──→ 模板路径

  stack/grid/split → html-layout.js        ← 走 _html() 预绑定路径
  tag-slide        → tag-renderer.js       ← 走 switch(tag) 查表
  title/content/.. → 对应页面模板            ← 传统模板路径
  chart            → chart-*.html.js


分叉点 2: PPT 导出分发（浏览器端）
───────────────────────────────────
SLIDE_DATA.parser ──→ 选择导出函数

  'tag'  → addTagSlidePptx()              ← blocks 遍历 + REGISTRY 查表
  null   → slide.type 分发 14 种函数       ← 每种类型独立函数
```

## 一个 chart block 的完整旅程

```
content.md:  <chart: pie; chartType: pie>
               | 组件 | 成本 |
               | 摄像头 | 25 |

    ① tag-parser.js → block = { tag:'chart', style:{chartType:'pie'},
                                 data:{headers:['组件','成本'], rows:[['摄像头','25']]} }

    ② layout-engine.js → fillStyleDefaults → style 补全 font-size/color/...
                          (保留 chartType:'pie' ★)

    ③ prerender/index.js → REGISTRY['chart'].html → chart-shell.render
                            block._html = function(style){ return chartShell.render(..., style); }

    ④ tag-renderer.js → case 'chart': buildEChartOption() + chartShell.render()
                         → ECharts <div> + <script> → HTML 字符串

    ⑤ ppt-extract.js → projectTag → { tag:'chart', style:{chartType:'pie',...}, data:{...} }
                        → 嵌入 SLIDE_DATA JSON

    ⑥ 浏览器端 → addTagSlidePptx() → REGISTRY['chart'].ppt(slide, data, style, rect, pptx)
                 → pptChart() → slide.addChart(pptx.charts.PIE, ...) ★
                 → OOXML 原生饼图 → slides.pptx
```
