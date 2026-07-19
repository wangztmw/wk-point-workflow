/**
 * renderer.js — HTML 渲染器
 *
 * 将 SlideAST[] + config → 完整 HTML 文档。
 * 生成的 HTML 包含：
 *   - 基础 CSS 样式
 *   - 所有幻灯片 div
 *   - ECharts + dom-to-pptx CDN
 *   - 导出工具栏（dom-to-pptx 导出 + PptxGenJS 原生导出）
 */

const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  title: '演示文稿',
  layout: '16x9',
  width: 960,
  height: 540,
  theme: {
    primary: '#667eea',
    accent: '#e94560',
    success: '#2ecc71',
    warning: '#f39c12',
    bg: '#ffffff',
    text: '#222222',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  chartColors: ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'],
  export: {
    svgAsVector: true,
    autoEmbedFonts: true,
  },
};

// 模板路由已移至 core/render/render.js — HTML 引擎不再管理模板

/**
 * 渲染完整 HTML 文档
 * @param {SlideAST[]} slides - 幻灯片 AST 数组
 * @param {Object} userConfig - 项目配置（可选）
 * @returns {string} 完整 HTML 字符串
 */
function render(slides, userConfig) {
  const config = mergeConfig(userConfig || {});

  // 生成主题 CSS 变量
  const customCSS = generateThemeCSS(config);

  // 布局预计算 + 统一渲染：给所有 block 生成 _html + _ppt + rect，再生成 slide 最终 HTML
  const { applyLayout } = require('../render/layout/layout-engine');
  const { renderBlocks, renderSlide } = require('../render/render');
  for (const ast of slides) {
    applyLayout(ast);
    var isLayout = ast.type === 'stack' || ast.type === 'grid' || ast.type === 'split';
    renderBlocks(ast.content.blocks, isLayout);
    renderSlide(ast, config);
  }

  // 图片文件夹解析：对 image-* 类型，从 images/<label>/ 子文件夹读取图片
  const projectDir = config.projectDir || null;
  for (const ast of slides) {
    resolveImageFromFolders(ast, projectDir);
  }

  // HTML 引擎只拼装已预渲染的 _html 字符串
  const slidesHTML = slides.map(ast => ast._html || '').join('\n');

  // 提取全部幻灯片结构数据（供浏览器端导出，图表+布局都需要）
  const slideData = extractAllSlideData(slides, config);

  // 组装完整文档
  return buildDocument({
    title: config.title,
    customCSS,
    slidesHTML,
    config,
    slideCount: slides.length,
    slideData,
  });
}

// ============================================================
// 内部函数
// ============================================================

function mergeConfig(userConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme: { ...DEFAULT_CONFIG.theme, ...(userConfig.theme || {}) },
    export: { ...DEFAULT_CONFIG.export, ...(userConfig.export || {}) },
    chartColors: userConfig.chartColors || DEFAULT_CONFIG.chartColors,
  };
}

/**
 * 从 images/<label>/ 子文件夹解析图片
 *
 * 图片标签来源（优先级）：
 *   1. content.md 中的 - 列表项（推荐，语义为"罗列图片"）
 *   2. H3+ 标题（向后兼容）
 *
 * - 如果子文件夹存在且有图片 → 读取为 base64 data URI
 * - 如果子文件夹为空或不存在 → src 置空（模板渲染占位框）
 * 仅对 image-* 类型生效；已有有效 src 的图片不做覆盖
 */
function resolveImageFromFolders(ast, projectDir) {
  // 标签语法：遍历 blocks 中的 img 标签，扫描文件夹
  if (ast.parser === 'tag') {
    resolveTagImages(ast, projectDir);
    return;
  }
  const { IMAGE_SLIDE_TYPES } = require('../render/build-slide-data');
  if (!projectDir || !IMAGE_SLIDE_TYPES.includes(ast.type)) return;

  const imagesDir = path.join(projectDir, 'images');
  if (!fs.existsSync(imagesDir)) return;

  // 获取图片标签：优先从 <img:标签名>，其次从 - 列表，最后从 H3+ 标题
  const existingImages = ast.content.images || [];
  let labels = existingImages.filter(img => img.label).map(img => img.label);
  if (labels.length === 0) {
    for (const list of ast.content.lists) {
      for (const item of list.items) {
        const text = (item.text || '').trim();
        if (text) labels.push(text);
      }
    }
  }
  if (labels.length === 0) {
    labels = ast.content.headings.filter(h => h.level >= 3).map(h => h.text);
  }
  if (labels.length === 0) return;

  // 检查现有图片是否已有有效 src（如果有则不覆盖）
  const hasExistingSrc = existingImages.length > 0 && existingImages.some(img => img.src && img.src.length > 100);

  const resolvedImages = labels.map((label, i) => {
    // 保留已有的有效 src
    if (hasExistingSrc && existingImages[i] && existingImages[i].src && existingImages[i].src.length > 100) {
      return { src: existingImages[i].src, label };
    }

    // 扫描 images/<label>/ 子文件夹
    const folderPath = path.join(imagesDir, label);
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath).filter(f =>
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f) && !f.startsWith('.')
      );
      if (files.length > 0) {
        const imgPath = path.join(folderPath, files[0]);
        try {
          const data = fs.readFileSync(imgPath);
          const ext = path.extname(files[0]).toLowerCase();
          const mimeMap = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };
          const mime = mimeMap[ext] || 'image/jpeg';
          return { src: `data:${mime};base64,${data.toString('base64')}`, label };
        } catch (e) {
          console.warn(`   ⚠ 读取图片失败: ${imgPath}`);
        }
      }
    }
    // 空文件夹 → 占位
    return { src: '', label };
  });

  ast.content.images = resolvedImages;
}

/** 标签语法：扫描 <img:标签名> 对应的 images/<标签名>/ 文件夹 */
function resolveTagImages(ast, projectDir) {
  const imagesDir = path.join(projectDir, 'images');
  if (!fs.existsSync(imagesDir)) return;

  for (const block of ast.content.blocks) {
    if (block.tag !== 'img') continue;
    const label = block.data.label;
    if (!label) continue;
    const folderPath = path.join(imagesDir, label);
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath).filter(f =>
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f) && !f.startsWith('.')
      );
      if (files.length > 0) {
        try {
          const imgPath = path.join(folderPath, files[0]);
          const data = fs.readFileSync(imgPath);
          const ext = path.extname(files[0]).toLowerCase();
          const mimeMap = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };
          const mime = mimeMap[ext] || 'image/jpeg';
          block.data.src = `data:${mime};base64,${data.toString('base64')}`;
        } catch (_) {}
      }
    }
    // 同步到 content.images
    if (!ast.content.images) ast.content.images = [];
    ast.content.images.push(block.data);
  }
}

function generateThemeCSS(config) {
  const t = config.theme;
  return `
    :root {
      --color-primary: ${t.primary};
      --color-accent: ${t.accent};
      --color-success: ${t.success};
      --color-warning: ${t.warning};
      --color-bg: ${t.bg};
      --color-text: ${t.text};
      --font-body: ${t.fontFamily};
      --font-heading: ${t.fontFamily};
      --slide-width: ${config.width}px;
      --slide-height: ${config.height}px;
    }
  `;
}

/**
 * 从 SlideAST 数组中提取图表数据
 * 供浏览器端 PptxGenJS 原生图表导出使用
 */
// 从 render/build-slide-data 导入
const { cleanMD, buildSlideData } = require('../render/build-slide-data');
const { DARK_SLIDE_TYPES } = require('../render/build-slide-data');

function extractAllSlideData(slides, config) {
  return slides.map(ast => buildSlideData(ast));
}

function buildDocument({ title, customCSS, slidesHTML, config, slideCount, slideData }) {
  const chartSlides = slideData.filter(s => s.type === 'chart');
  const chartDataJSON = JSON.stringify(chartSlides);
  const slideDataJSON = JSON.stringify(slideData);
  const colorsJSON = JSON.stringify(
    (config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'])
      .map(c => c.replace('#', ''))
  );

  const { generate: generatePptScript } = require('../ppt-engine/ppt-engine-assemble');
  const pptScript = generatePptScript({
    slideDataJSON, chartDataJSON, colorsJSON,
    backgroundJSON: config.background ? JSON.stringify(config.background) : 'null',
    slideCount, title: escapeHTML(title),
    svgAsVector: config.export.svgAsVector,
    autoEmbedFonts: config.export.autoEmbedFonts,
    chartSlidesLen: chartSlides ? chartSlides.length : 0,
    darkTypesJSON: JSON.stringify(DARK_SLIDE_TYPES),
  });


  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)}</title>
<!-- ECharts CDN -->
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
/* ===== 全局样式 ===== */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;background:#f0f0eb;color:#1a1a1a;display:flex;flex-direction:column;align-items:center;padding:24px 20px 60px;min-height:100vh}

/* ===== 工具栏 ===== */
.toolbar{position:sticky;top:0;z-index:100;background:#fff;padding:12px 24px;margin-bottom:28px;display:flex;gap:10px;align-items:center;box-shadow:0 1px 0 #e8e8ec,0 4px 12px rgba(0,0,0,0.04);flex-wrap:wrap;justify-content:center;width:100%;max-width:1000px}
.toolbar h1{font-size:15px;font-weight:600;margin-right:8px;white-space:nowrap;color:#1a1a1a}
.toolbar .btn{padding:8px 16px;border:1px solid #e8e8ec;border-radius:0;font-size:13px;font-weight:500;cursor:pointer;background:#fff;color:#555;font-family:inherit}
.toolbar .btn:hover{background:#f5f5f5;border-color:#ccc}
.toolbar .btn-primary{background:#4f5fd9;color:#fff;border-color:#4f5fd9}
.toolbar .btn-primary:hover{background:#3d4dc0}
.toolbar .btn-success{background:#2ecc71;color:#fff;border-color:#2ecc71}
.toolbar .status{font-size:12px;color:#888;margin-left:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ===== 幻灯片容器 ===== */
.slides-wrapper{display:flex;flex-direction:column;gap:36px;width:100%;max-width:1000px}
.slide{width:var(--slide-width);height:var(--slide-height);position:relative;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);background:var(--color-bg);flex-shrink:0;border-left:3px solid transparent}
.slide:hover{border-left-color:var(--color-primary);transition:border-left-color .3s}
@media(max-width:1000px){.slide{width:90vw;height:calc(90vw * .5625)}}

/* ===== 加载遮罩 ===== */
.loading-overlay{display:none;position:fixed;inset:0;z-index:999;background:rgba(255,255,255,0.85);justify-content:center;align-items:center}
.loading-overlay.active{display:flex}
.loading-box{background:#fff;padding:28px 44px;text-align:center;box-shadow:0 2px 24px rgba(0,0,0,0.1)}
.spinner{width:36px;height:36px;border:2px solid #e8e8ec;border-top-color:#4f5fd9;animation:spin .8s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== 主题 CSS 变量 ===== */
${customCSS}
${config.background && config.background.backgroundImage ? `
  /* 模板背景：非标题页叠加底板 */
  .slide:not(.slide-title)::before {
    content: '';
    position: absolute; inset: 0; z-index: 0;
    background-image: url(${config.background.backgroundImage});
    background-size: 960px 540px;
    background-repeat: no-repeat;
    pointer-events: none;
  }
  .slide:not(.slide-title) > * { position: relative; z-index: 1; }
` : ''}
</style>
</head>
<body>

<!-- ===== 导出工具栏 ===== -->
<div class="toolbar">
  <h1>📊 ${escapeHTML(title)}</h1>
  <span style="font-size:12px;color:#8899aa;">${slideCount} 页</span>
  <span style="flex:1;"></span>
  <button class="btn btn-primary" onclick="exportDomToPptx()">⬇ 导出 PPTX</button>
  <span class="status" id="status"></span>
</div>

<!-- ===== 幻灯片 ===== -->
<div class="slides-wrapper" id="slides-container">
${slidesHTML}
</div>

<!-- ===== 加载遮罩 ===== -->
<div class="loading-overlay" id="loading">
  <div class="loading-box">
    <div class="spinner"></div>
    <p>正在生成 PPTX...</p>
    <p style="font-size:12px;color:#8899cc;margin-top:4px;">DOM 测量 + 形状映射中</p>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/dom-to-pptx@1.1.5/dist/dom-to-pptx.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>

${pptScript}
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { render, DEFAULT_CONFIG };
