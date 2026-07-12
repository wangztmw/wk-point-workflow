# HTML → 可编辑 PPT 转换演示

基于 [dom-to-pptx](https://www.npmjs.com/package/dom-to-pptx) 的完整演示项目。

## 快速开始

```bash
# 方式一：直接打开
open index.html

# 方式二：本地服务器
npm start
```

然后点击页面顶部 **"导出为 PPTX"** 按钮即可。

## 项目结构

```
trans/
├── index.html      # 6 页幻灯片（标题/文本/柱状图/饼图/SVG 图形/总结）
├── export.js       # Chart.js 图表初始化 + 导出逻辑
├── package.json
└── README.md
```

## 导出效果

| 元素类型 | PPT 中可编辑？ | 说明 |
|---------|:---------:|------|
| 文本（标题/段落/列表） | ✅ | 字体/颜色/大小/粗细全部保留 |
| CSS 渐变背景 | ✅ | 映射为 PPT 矢量渐变 |
| 圆角边框 | ✅ | border-radius → PPT 圆角矩形 |
| 阴影 | ✅ | box-shadow → PPT 阴影 |
| SVG 图形 | ✅ | svgAsVector 模式 → PPT 中"转换为形状" |
| Canvas 图表 | ⚠️ 图片 | Chart.js 默认 Canvas 渲染 → 导出为 PNG |
| CSS 伪元素 | ❌ | ::before/::after 不被转换 |

## 如何让图表也可编辑？

两种策略：

### 策略 A：SVG 渲染图表

使用 ECharts 的 SVG 渲染模式（`renderer: 'svg'`），图表会以 SVG 形式存在于 DOM 中，导出时 `svgAsVector: true` 保留矢量。

```js
// ECharts SVG 渲染
const chart = echarts.init(dom, null, { renderer: 'svg' });
```

### 策略 B：手动绘制 SVG 图表

用原生 SVG 绘制图表（rect、circle、path 等），导出后在 PPT 中右键 → "转换为形状"获得完全可编辑的图表图形。

## 技术原理

```
HTML DOM 元素
    ↓ getBoundingClientRect() + getComputedStyle()
几何信息 + 样式（坐标/尺寸/颜色/字体/渐变...）
    ↓ 映射规则
PPTX 原生形状（TextBox/Shape/Picture/Group）
    ↓ PptxGenJS 序列化
标准 .pptx 文件（Office Open XML）
```

## 依赖

- [dom-to-pptx](https://www.npmjs.com/package/dom-to-pptx) v1.1.5 — CDN 引入
- [Chart.js](https://www.chartjs.org/) v4.4 — CDN 引入
- 无需 Node.js 服务器，纯浏览器端运行

## 兼容性

- 导出文件可在 PowerPoint / WPS / Keynote / Google Slides 中打开
- 推荐使用 Chrome/Edge 浏览器运行此演示
