# 开发计划

## 已完成

### 核心引擎
- [x] parser：Markdown → SlideAST（20种type，blocks数组保留原始顺序）
- [x] templates：20个模板（9布局 + 8图表 + 5特殊内容）
- [x] html-engine：SlideAST + 模板 → HTML 预览
- [x] ppt-engine：导出函数库（5种底层技术，6个.js模块），浏览器端一键导出PPTX
- [x] builder：CLI构建（--all / --watch / --theme / --styleguide）
- [x] styler：基础背景提取（图片→base64 + SVG→矢量图形）

### 规范体系
- [x] types/：SlideAST / SLIDE_DATA / Markdown / 模板开发 四份规范
- [x] KNOWLEDGE.md：12条踩坑 + 5种导出技术 + 迁移实录（1061行）

### 项目实例
- [x] ai-glasses：43页 AI眼镜行业分析报告
- [x] demo-1 / demo-2：示例项目

---

## 开发中：Styler 模块

Styler 是一个独立的背景元素管理模块。核心流程：

```
参考PPT/图片 → styler 提取背景元素 → 存为项目资源
                                            │
生成PPT时 ──→ 选择应用哪些元素 ──→ 元素作为底层画到PPT上
```

### 功能：背景元素提取与应用

**当前进度**：
- [x] 图片 → base64 编码
- [x] SVG → 矢量图形 elements 转换（to-shapes.js）
- [x] 背景图叠加到 slide（CSS + PptxGenJS slide.background）
- [x] drawBackgroundShapes() 画矢量背景到 PPTX 底层
- [x] builder 自动检测 assets/ 目录并加载背景
- [ ] 元素独立存储：每个提取的元素存为独立文件，可增删改
- [ ] 选择性应用：不同页面可以应用不同的背景元素组合
- [ ] 元素预览：在 styleguide 中可以看到每个元素的独立效果

**目标效果**：

```
Styler 提取阶段：
  公司PPT模板 → styler → 识别并拆出：
    ├── 顶部蓝色装饰条  → header-bar.json
    ├── 底部公司logo     → footer-logo.json
    ├── 页码区域         → page-number.json
    └── 左侧竖线         → left-accent.json

项目构建阶段：
  builder 检测到项目配置了背景元素
    → 生成 HTML/PPTX 时：
        title 页：不加背景（保留封面设计）
        content 页：加 header-bar + left-accent
        chart 页：加 header-bar + page-number
        所有背景元素画在内容下层（先画背景，后画内容）
```

**接口设计**（预期）：

```json
// projects/my-slides/bg-config.json
{
  "elements": ["header-bar", "left-accent"],
  "applyTo": ["content", "summary", "chart", "table"],
  "skipOn": ["title", "section", "ending"]
}
```

---

## 计划中

### 图片增强：Markdown 内嵌图片 → HTML + PPTX

**目标**：Markdown 里用 `![](path)` 插入图片，自动映射到 HTML 和 PPTX 的对应位置。

**设计**：
```
projects/my-slides/
├── content.md           ← ![](images/chart.png)
└── images/
    └── chart.png        ← 图片放同级目录
```

图片在 Markdown 中的位置（由 `blocks[]` 数组保留）决定了它在 HTML 和 PPTX 中的渲染位置。

**核心改动**：

| 步骤 | 模块 | 做什么 |
|------|------|--------|
| 1 | parser | 构建时把本地路径 `images/photo.png` 转 base64，存入 AST |
| 2 | content 模板 | 图片按 blocks 顺序内联渲染，不是附加在末尾 |
| 3 | ppt-engine | text-layout.js 加通用图文混排：检测图片 block → `slide.addImage()`，否则 `addText()` |
| 4 | 其他模板 | summary / two-column 等模板也支持 blocks 中的图片渲染 |
| 5 | 尺寸控制 | 默认 `max-height:440px`，后续支持 `![](photo.png =400x300)` 手动指定 |

**当前状态**：
- [x] parser 解析 `![]()` 语法
- [x] blocks 数组保留图片在文档中的位置
- [ ] content 模板按 blocks 顺序内联渲染图片
- [ ] ppt-engine 导出时嵌入图片
- [ ] 本地路径 → base64 转换
- [ ] summary / two-column 等模板支持图片

### 模板系统
- [ ] 模板市场：用户可自定义模板包，通过 config.json 切换
- [ ] 布局描述层（spec）：HTML和PPTX共读同一份布局参数，保证预览和导出一致
- [ ] 模板热加载：改模板文件后无需重启构建

### 导出增强
- [ ] ppt-engine 各模块真正独立（目前 script.js 一次性拼接，可改为按需加载）
- [ ] 支持导出为 PDF
- [ ] 支持导出为图片序列（PNG/JPEG）

### 编辑器
- [ ] 实时预览：改 Markdown 后浏览器自动刷新
- [ ] 拖拽排序：可视化调整幻灯片顺序
- [ ] 内联编辑：在预览页直接修改文字

---

## 待调研

- [ ] PPTX 文件解析（读 theme1.xml / slideMaster.xml）
- [ ] 光波导等AR眼镜技术细节（补充 ai-glasses 项目）
- [ ] PptxGenJS 是否支持 slide master 设置
- [ ] 多语言支持（英文模板）
