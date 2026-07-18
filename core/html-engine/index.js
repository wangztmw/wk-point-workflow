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

// 模板路由：从 types/html-registry.js 读取映射，拼接绝对路径
const { TEMPLATE_MAP } = require('../types/html-registry');
const TEMPLATE_REGISTRY = {};
for (const [type, tplPath] of Object.entries(TEMPLATE_MAP)) {
  TEMPLATE_REGISTRY[type] = path.resolve(__dirname, '..', '..', 'templates', tplPath);
}

/**
 * 根据 slide AST 解析实际使用的模板名
 * chart 类型会根据 props.chartType 进一步细分
 */
function resolveTemplateName(ast) {
  // 标签语法：布局类型走自己的模板（CSS流式），其余走通用绝对定位渲染器
  if (ast.parser === 'tag') {
    if (ast.type === 'stack' || ast.type === 'grid' || ast.type === 'split') {
      return ast.type;
    }
    return 'tag-slide';
  }

  if (ast.type === 'chart') {
    const ct = (ast.props.chartType || ast.props.type || 'bar').toLowerCase();
    // 映射到具体的 chart-* 模板
    const mapped = 'chart-' + ct;
    if (TEMPLATE_REGISTRY[mapped]) return mapped;
  }
  return ast.type;
}

/**
 * 渲染完整 HTML 文档
 * @param {SlideAST[]} slides - 幻灯片 AST 数组
 * @param {Object} userConfig - 项目配置（可选）
 * @returns {string} 完整 HTML 字符串
 */
function render(slides, userConfig) {
  const config = mergeConfig(userConfig || {});

  // 加载模板
  const templates = loadTemplates();

  // 读取 base.css
  const baseCSS = loadBaseCSS();

  // 生成自定义 CSS 变量
  const customCSS = generateThemeCSS(config);

  // 布局预计算 + 统一渲染：给所有 block 生成 _html + _ppt + rect
  const { applyLayout } = require('../render/layout/layout-engine');
  const { renderBlocks } = require('../render/render');
  for (const ast of slides) {
    applyLayout(ast);
    var isLayout = ast.type === 'stack' || ast.type === 'grid' || ast.type === 'split';
    renderBlocks(ast.content.blocks, isLayout);
  }

  // 图片文件夹解析：对 image-* 类型，从 images/<label>/ 子文件夹读取图片
  const projectDir = config.projectDir || null;
  for (const ast of slides) {
    resolveImageFromFolders(ast, projectDir);
  }

  // 渲染每页幻灯片
  const slidesHTML = slides.map((ast) => {
    const tplName = resolveTemplateName(ast);
    const template = templates[tplName] || templates['content'];
    return template.render(ast, config);
  }).join('\n');

  // 提取全部幻灯片结构数据（供浏览器端导出，图表+布局都需要）
  const slideData = extractAllSlideData(slides, config);

  // 组装完整文档
  return buildDocument({
    title: config.title,
    baseCSS,
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
  const { IMAGE_SLIDE_TYPES } = require('../types/ppt-extract');
  const imageTypes = IMAGE_SLIDE_TYPES;
  if (!projectDir || !imageTypes.includes(ast.type)) return;

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

function loadTemplates() {
  const templates = {};
  const coreDir = __dirname;

  for (const [type, filePath] of Object.entries(TEMPLATE_REGISTRY)) {
    try {
      const full = path.resolve(coreDir, filePath);
      templates[type] = require(full);
    } catch (err) {
      console.warn(`   ⚠ 模板 "${type}" 加载失败: ${err.message}，使用 content 回退`);
      templates[type] = templates['content'];
    }
  }
  return templates;
}

function loadBaseCSS() {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'base.css'), 'utf-8');
  } catch {
    return '/* base.css not found */';
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
// 从 types/ppt-extract 导入（唯一真相源）
const { cleanMD, toRuns } = require('../types/ppt-extract');

function extractAllSlideData(slides, config) {
  const { PROJECTION } = require('../types/ppt-extract');
  const all = [];

  for (const ast of slides) {
    const base = {
      index: ast.index,
      type: ast.type,
      title: cleanMD(ast.props.title || (ast.content.headings[0]?.text || '')),
    };

    // 标签语法：tag project 内部处理
    const key = ast.parser === 'tag' ? 'tag' : ast.type;
    const project = PROJECTION[key];
    if (project) {
      all.push({ ...base, ...project(ast) });
    } else {
      all.push(base);
    }
  }

  return all;
}

function buildDocument({ title, baseCSS, customCSS, slidesHTML, config, slideCount, slideData }) {
  const chartSlides = slideData.filter(s => s.type === 'chart');
  const chartDataJSON = JSON.stringify(chartSlides);
  const slideDataJSON = JSON.stringify(slideData);
  const colorsJSON = JSON.stringify(
    (config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'])
      .map(c => c.replace('#', ''))
  );

  const { generate: generatePptScript } = require('../ppt-engine/ppt-engine-assemble');
  const { DARK_SLIDE_TYPES } = require('../types/ppt-extract');
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
/* ===== 基础样式 ===== */
${baseCSS}

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
