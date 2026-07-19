# 数据结构总览

本项目核心数据结构有三层，分别对应三个处理阶段：

```
content.md          用户写的 Markdown
    │
    ▼  parser/index.js
SlideAST            结构化中间数据（parser 输出 = renderer 输入）
    │
    ├──▶ renderer/index.js (Node.js)
    │       │
    │       ├──▶ slides.html       HTML 预览（模板渲染）
    │       └──▶ SLIDE_DATA JSON   嵌入 HTML 供浏览器导出使用
    │
    └──▶ 浏览器 JS (PptxGenJS)
            └──▶ slides.pptx       PPTX 导出
```

## 三个核心结构

| 结构 | 定义文件 | 谁产出 | 谁消费 |
|------|---------|--------|--------|
| **SlideAST** | `ast.md` | parser | renderer（模板 + 导出） |
| **SLIDE_DATA** | `slide-data.md` | extractAllSlideData() | 浏览器 PptxGenJS |
| **Markdown 规范** | `markdown.md` | 用户手写 | parser |

## 关系图

```
Markdown 规范 ──▶ parser ──▶ SlideAST
                                 │
                    ┌────────────┤
                    ▼            ▼
              模板渲染(HTML)   extractAllSlideData()
                                    │
                                    ▼
                              SLIDE_DATA JSON
                                    │
                                    ▼
                           buildPptxFromSlideData()
                                    │
                                    ▼
                              slides.pptx
```

## 模块依赖

```
types/         ← 纯规范文档，不依赖任何代码
core/parser    ← 依赖 types/ast.md + types/markdown.md
core/renderer  ← 依赖 types/ast.md + types/slide-data.md + types/template.md
core/builder   ← 依赖 core/parser + core/renderer
```
