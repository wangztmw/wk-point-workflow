# 模板开发规范

## 模板文件位置

```
core/renderer/templates/
├── layouts/        页面布局（9个）
├── charts/         图表（8个）
└── contents/       特殊内容 + images/（5个）
```

## 新增模板步骤（5步）

### 1. 创建模板文件

```js
// core/renderer/templates/layouts/my-new.js
function render(ast, config) {
  const { content, props, index } = ast;  // SlideAST
  // 返回 HTML 字符串
  return `<div class="slide slide-my-new">...</div>`;
}
function escapeHTML(s) { ... }
module.exports = { render };
```

### 2. 注册到 TEMPLATE_REGISTRY

在 `core/renderer/index.js` 的 `TEMPLATE_REGISTRY` 中添加：
```js
'my-new': './templates/layouts/my-new.js',
```

### 3. 添加数据提取

在 `extractAllSlideData()` 中添加 `else if (ast.type === 'my-new')` 分支，决定 `SLIDE_DATA` 中包含哪些字段。

### 4. 添加导出函数

在 `buildPptxFromSlideData()` 中添加路由：
```js
else if (s.type === 'my-new') addMyNewSlidePptx(pptx, s);
```

并实现 PptxGenJS 渲染函数：
```js
function addMyNewSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  // ... 用 slide.addText/addShape/addImage 构建
}
```

### 5. 更新规范文档

- `types/ast.md`：添加 type 枚举
- `types/slide-data.md`：添加字段说明
- `types/markdown.md`：添加写法示例

## 模板可用的输入

```js
ast.type          // 幻灯片类型
ast.props         // { title, chartType, theme, ... }
ast.content       // SlideContent { headings, lists, paragraphs, table, images, blocks }
ast.index         // 0-based 序号
config            // 项目配置 { theme, chartColors, export, background, ... }
```

## 渲染函数规范

- 返回合法 HTML 字符串
- 使用 `escapeHTML()` 防止 XSS
- CSS 优先用 `base.css` 中的类，内联样式用于布局定位
- 图表模板需生成唯一 `chartId = 'chart_' + type + '_' + index`
- ECharts 使用 `renderer: 'svg'` 以支持 PPT 矢量导出

## PptxGenJS 导出函数规范

- 函数签名：`function addXxxSlidePptx(pptx, s)`，`s` 来自 SLIDE_DATA
- 第一行：`var slide = pptx.addSlide(); drawBackgroundShapes(slide);`
- 坐标单位：英寸（10×5.625 为 16:9 全幅）
- 颜色格式：无 `#` 的 6 位 hex（如 `'2563EB'`）
- 必须用 try/catch 包裹 `slide.addImage()`（图片可能加载失败）
- 瀑布图类型走形状拼凑，不走 dom-to-pptx
