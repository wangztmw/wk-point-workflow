# CLAUDE.md

> Markdown → HTML → PPT 幻灯片生成系统。本文档给 Claude 看，也给人看。

## 一句话

写 `content.md` → 跑 `node core/builder/assemble.js <项目名>` → 浏览器预览 + 一键导出 PPTX。

## 架构

```
content.md ──parser──→ SlideAST ──layout+render──→ ast._html + ast._slideData
                                        │                    │
                                   html-engine          ppt-engine
                                        │                    │
                                   slides.html         slides.pptx
```

**四层流水线：** parser 解析文本 → layout 算坐标 → render 调模板生成数据 → 两个引擎分别消费。

## 核心模块（全部在 `core/` 下，20 个 JS 文件）

```
parser/           Markdown→SlideAST（6 文件）
  assemble.js       入口: parse()
  split.js          按 --- 分页 + 提取指令
  content.js        Markdown 正文解析（标题/表格/列表/段落）
  normalize.js      → tag 格式转换 + type 映射 + 坐标堆叠
  infer.js          类型推断 + 文本工具
  tag-parser.js     原生 tag 语法（不变）

layout/           纯计算（4 文件）
  assemble.js       applyLayout: 补默认值 + 算坐标
  style.js          fillStyleDefaults
  height.js         textLines, itemHeight, blockHeight
  positions.js      stackPositions, splitPositions, gridPositions

render/           渲染核心（4 文件）
  assemble.js       renderAll: blocks → slides → ppt-data
  blocks.js         renderBlocks + 7 bind* → _html + _ppt + rect
  slides.js         renderSlide → Stack/Split/Grid/TagSlide → ast._html
  ppt-data.js       buildSlideData → ast._slideData（IMAGE/DARK 常量）

html-engine/       HTML 文档输出（4 文件）
  assemble.js       render(): 编排 → slides.map(s=>s._html).join('')
  config.js         DEFAULT_CONFIG + mergeConfig
  images.js         图片文件夹解析（→ base64）
  document.js       buildDocument: CSS + HTML + PPT脚本 → 完整文件

ppt-engine/        PPT 导出，浏览器端执行（6 文件）
  assemble.js       Node端: 拼接模块为 <script>
  init.js           浏览器端: 全局变量 + UI工具
  export.js         浏览器端: buildPptxFromSlideData + exportPPTX ★入口
  base/tag-export.js         executeBlock（常规路径：_ppt.action → slide.xxx()）
  ppt-graph/native-chart.js  OOXML 原生图表（特殊路径）
  ppt-graph/waterfall.js     形状拼凑瀑布图（特殊路径）

builder/           CLI 工具（3 文件）
  assemble.js       入口: main() + buildProject()
  config.js         THEME_PRESETS + deepMerge
  utils.js          getProjectDirs + openInBrowser

meta-templates/    模板（12 文件，只在 render/blocks.js 中被调用）
  types/ast.js      SlideAST 结构定义
  elements/
    text/     heading.js  paragraph.js  list.js  page-title.js
    visual/   image.js  box.js
    data/     table.js  chart-shell.js  waterfall.js
    shared/   escape.js  inline.js
```

## 数据流（一次构建的完整过程）

```
① parser/assemble.js parse(md)
   → SlideAST[]（所有 slide 统一为 tag 格式，parser='tag'）

② html-engine/assemble.js render(slides, config)
   ├→ layout/assemble.js applyLayout(ast)      补默认值 + 布局 slide 算英寸坐标
   ├→ render/assemble.js renderAll(ast, config)
   │    ├→ blocks.js renderBlocks()             _html 死字符串 + _ppt 描述符 + rect
   │    ├→ slides.js renderSlide()              ast._html 最终 HTML
   │    └→ ppt-data.js buildSlideData()         ast._slideData
   ├→ images.js resolveImages()                 图片 base64
   ├→ slides.map(s=>s._html).join('')           拼 HTML
   ├→ ppt-engine/assemble.js generate()         拼 PPT 脚本
   └→ document.js buildDocument()               完整 slides.html → 写文件
```

## 快速开始

```bash
node core/builder/assemble.js <项目名>           # 构建
node core/builder/assemble.js <项目名> --open     # 构建+打开
node core/builder/assemble.js --all              # 构建所有
node core/builder/assemble.js --watch <项目名>    # 监听
node core/builder/assemble.js <项目名> --theme dark  # 换主题
```

## 加新组件的流程

```
① meta-templates/types/ast.js     注册新的 block 类型和工厂函数
② meta-templates/elements/xxx.js  写元素模板（流模式，只输出内容 HTML）
③ render/blocks.js                bindXxx 函数（_html + _ppt 生成）
④ parser/normalize.js             TYPE_MAP 或 TAG_STYLE（如需要默认样式）
```

## 关键约定

1. **render 是唯一"知道 tag"的地方**：所有 tag→模板的映射在 `render/blocks.js`
2. **_html 是死字符串，_ppt 是描述符**：引擎只遍历拼接，不调模板
3. **markdown 写完后自动转 tag**：`parser/normalize.js` 的 `TYPE_MAP` + `TAG_STYLE`
4. **元素模板只输出流式内容**：不设固定宽高，外层容器负责定位
5. **PPT 两条路径**：常规走 executeBlock（读 _ppt.action），chart/waterfall 走 ppt-graph/
6. **每个文件夹都有 assemble.js**：parser/layout/render/html-engine/ppt-engine/builder

## 踩坑备忘

- `fillStyleDefaults` 新建对象会丢非标准属性（如 chartType）→ 用 Object.keys 先拷贝
- `pptChart` 需要 `pptx` 参数访问 `pptx.charts.PIE` → executeBlock 传参解决
- markdown block 无 x/y 坐标 → `normalizeToTag` 第三遍自动堆叠
- 封面/过渡页文字变黑 → `normalizeToTag` 深色类型强制 `color:'FFFFFF'`
- 目录序号全是 "1." → bindList 前缀改 `(i+1)+'. '`
- 第一级标题与 pageTitle 重复 → `_skip` 标记去重
- `styleToHtml` 在流模式下永远不调用 → 8 个元素模板删了一半死代码
- PptxGenJS border 只认数组 `[上,右,下,左]`
- `addImage` 必须 try/catch 包裹
- 瀑布图是形状拼的，不是原生图表

## 文档索引

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | 项目总览+架构说明（本文件） |
| `README.md` | 项目介绍 |
| `docs/data-flow.md` | 完整数据流图——Markdown 到 PPT 的每一步转换 |
| `docs/knowledge.md` | 历史踩坑记录（1061行） |
| `docs/roadmap.md` | 项目路线图 |
| `docs/markdown-syntax.md` | content.md 写法规范（所有 slide 类型语法） |
| `docs/schema.md` | 数据结构说明（SlideAST / SLIDE_DATA） |
| `docs/slide-data.md` | SLIDE_DATA JSON 格式定义 |
| `docs/template-dev.md` | 模板开发指南（已过时，供参考） |
| `docs/render-refactoring-notes.md` | Render 重构全记录：6轮迭代，踩坑与经验 |
