# Markdown → HTML → PPT 三层幻灯片生成系统

把 Markdown 变成可编辑的 PowerPoint 演示文稿。

## 三层架构

```
content.md  →  SlideAST  →  slides.html  →  slides.pptx
 (你写的)      (结构化数据)   (预览+导出)     (最终交付)
```

- **Markdown**：内容源，用 HTML 注释标注幻灯片类型（title/content/chart/summary…）
- **HTML**：中间预览层，ECharts 渲染图表 + 导出工具栏
- **PPTX**：PptxGenJS 数据驱动导出，图表是原生 OOXML（双击编辑数据）

## 快速开始

```bash
# 构建示例项目
node core/builder/index.js demo-1

# 浏览器打开生成的 HTML
open projects/demo-1/output/slides.html

# 点击"导出 PPTX"按钮 → 得到 .pptx
```

## 可用命令

```bash
node core/builder/index.js <项目名>     # 构建指定项目
node core/builder/index.js --all        # 构建所有项目
node core/builder/index.js --watch      # 监听模式
node core/builder/index.js --open       # 构建后在浏览器打开
node core/builder/index.js --theme dark # 使用主题预设
```

## 幻灯片类型

在 Markdown 中用 `<!-- slide: type -->` 指定：

| 类型 | 用途 | 示例 |
|------|------|------|
| `title` | 封面页 | 渐变背景 + 大标题 |
| `content` | 内容页 | 标题 + 列表 + **粗体** |
| `summary` | 总结页 | H3 → 卡片网格 |
| `two-column` | 两栏布局 | 左右分栏 |
| `chart, type=bar` | 柱状图 | 表格数据 → ECharts SVG |
| `chart, type=pie` | 饼图 | 表格数据 → ECharts SVG |
| `chart, type=line` | 折线图 | 平滑曲线 + 面积填充 |
| `chart, type=radar` | 雷达图 | 多维度评估 |
| `chart, type=pareto` | 帕累托图 | 80/20 分析 |
| `chart, type=waterfall` | 瀑布图 | 浮动柱 + 虚线串联 |
| `chart, type=waterfall2` | 分段瀑布图 | 中间合计柱 + 分段累计 |

## 导出技术

统一使用 PptxGenJS 数据驱动导出：
- **文字页**：富文本渲染，保留粗体/斜体
- **柱/饼/线/雷达图**：原生 OOXML 图表，双击编辑数据表
- **瀑布图**：形状拼凑，每根柱子 = 独立矩形

## 项目结构

```
core/               # 技术层
  parser/             Markdown → SlideAST
  renderer/           AST → HTML + 浏览器导出引擎
    templates/        12 个幻灯片模板
  exporter/           AST → PPTX (Node.js)
  builder/            CLI 构建工具
projects/           # 输出层（每个项目独立）
  demo-1/            7 页示例
  demo-2/            6 页示例
trans/              # 原始实验代码
KNOWLEDGE.md        # 经验文档 + 核心代码参考
```
