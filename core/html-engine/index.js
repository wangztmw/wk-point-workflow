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

// 模板注册表：类型 → 模板文件
// layouts/ = 页面布局  charts/ = 图表  contents/ = 特殊内容
const TEMPLATE_REGISTRY = {
  'title':         '../templates/layouts/title.html.js',
  'content':       '../templates/layouts/content.html.js',
  'summary':       '../templates/layouts/summary.html.js',
  'two-column':    '../templates/layouts/two-column.html.js',
  'toc':           '../templates/layouts/toc.html.js',
  'section':       '../templates/layouts/section.html.js',
  'ending':        '../templates/layouts/ending.html.js',
  'chart':         '../templates/charts/chart-bar.html.js',
  'chart-bar':     '../templates/charts/chart-bar.html.js',
  'chart-pie':     '../templates/charts/chart-pie.html.js',
  'chart-line':    '../templates/charts/chart-line.html.js',
  'chart-radar':   '../templates/charts/chart-radar.html.js',
  'chart-pareto':  '../templates/charts/chart-pareto.js',
  'chart-compare': '../templates/charts/chart-compare.js',
  'chart-waterfall': '../templates/charts/chart-waterfall.js',
  'chart-waterfall2':'../templates/charts/chart-waterfall2.js',
  'three-column':  '../templates/layouts/three-column.html.js',
  'kpi-grid':      '../templates/layouts/kpi-grid.html.js',
  'table':         '../templates/contents/table.html.js',
  'quote':         '../templates/contents/quote.html.js',
  'image-text':    '../templates/contents/images/image-text.html.js',
  'image-full':    '../templates/contents/images/image-full.html.js',
  'image-grid':    '../templates/contents/images/image-grid.html.js',
  'image-gallery': '../templates/contents/images/image-gallery.js',
};

/**
 * 根据 slide AST 解析实际使用的模板名
 * chart 类型会根据 props.chartType 进一步细分
 */
function resolveTemplateName(ast) {
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
  const imageTypes = ['image-gallery', 'image-grid', 'image-text', 'image-full'];
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
    return fs.readFileSync(path.join(__dirname, '..', 'templates', 'base.css'), 'utf-8');
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
function cleanMD(s) { return (s||'').replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/`([^`]+)`/g,'$1'); }

/** 将 parser 的 inlineMarkup 节点转为 PptxGenJS 富文本 runs */
function toRuns(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [{ text: '', options: {} }];
  var runs = [];
  function walk(ns) {
    ns.forEach(function(n) {
      if (n.type === 'text') runs.push({ text: n.value, options: {} });
      else if (n.type === 'bold') { n.content.forEach(function(c) { runs.push({ text: c.value || '', options: { bold: true } }); }); }
      else if (n.type === 'italic') { n.content.forEach(function(c) { runs.push({ text: c.value || '', options: { italic: true } }); }); }
      else if (n.type === 'code') runs.push({ text: n.value, options: { fontFace: 'Courier New', color: '666666' } });
    });
  }
  walk(nodes);
  return runs.length > 0 ? runs : [{ text: '', options: {} }];
}

function extractAllSlideData(slides, config) {
  const all = [];

  for (const ast of slides) {
    const base = {
      index: ast.index,
      type: ast.type,
      title: cleanMD(ast.props.title || (ast.content.headings[0]?.text || '')),
    };

    if (ast.type === 'chart') {
      const table = ast.content.table;
      if (!table || !table.headers || table.headers.length < 2) {
        all.push(base);
        continue;
      }
      const chartType = (ast.props.chartType || ast.props.type || 'bar').toLowerCase();
      const categories = table.rows.map(row => row[0]);
      const series = [];
      for (let col = 1; col < table.headers.length; col++) {
        series.push({ name: table.headers[col], values: table.rows.map(row => parseFloat(row[col]) || 0) });
      }
      all.push({ ...base, type: 'chart', chartType: chartType, categories, series });
    } else if (ast.type === 'title') {
      const subtitle = cleanMD(ast.content.headings[1]?.text || '');
      all.push({ ...base, subtitle });
    } else if (ast.type === 'content') {
      const items = [];
      for (const list of ast.content.lists) {
        for (const item of list.items) items.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
      }
      const subHeadings = ast.content.headings.filter(h => h.level >= 3).map(h => ({ level: h.level, text: cleanMD(h.text) }));
      all.push({ ...base, items, subHeadings });
    } else if (ast.type === 'summary') {
      const cards = [];
      const h3s = ast.content.headings.filter(h => h.level >= 3);
      for (const h of h3s) {
        cards.push({ title: cleanMD(h.text), items: [] });
      }
      // 把列表项分配给最近的 h3 卡片
      for (const list of ast.content.lists) {
        for (const item of list.items) {
          if (cards.length > 0) cards[cards.length - 1].items.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
        }
      }
      all.push({ ...base, cards });
    } else if (ast.type === 'two-column') {
      const h3s = ast.content.headings.filter(h => h.level >= 3);
      const allItems = [];
      for (const list of ast.content.lists) {
        for (const item of list.items) allItems.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
      }
      const mid = Math.ceil(allItems.length / 2);
      all.push({
        ...base,
        left: { title: cleanMD(h3s[0]?.text || '左栏'), items: allItems.slice(0, mid) },
        right: { title: cleanMD(h3s[1]?.text || '右栏'), items: allItems.slice(mid) },
      });
    } else if (ast.type === 'toc') {
      const items = ast.content.headings.filter(h => h.level >= 2).map(h => h.text);
      all.push({ ...base, items });
    } else if (ast.type === 'section') {
      all.push({ ...base, subtitle: ast.content.headings[1]?.text || '' });
    } else if (ast.type === 'table') {
      const table = ast.content.table;
      all.push({ ...base, headers: table ? table.headers : [], rows: table ? table.rows : [] });
    } else if (ast.type === 'ending') {
      all.push({ ...base, contact: ast.content.paragraphs.map(p => p.text).join('  |  ') });
    } else if (ast.type === 'quote') {
      const author = ast.content.headings[1]?.text || (ast.content.paragraphs[0]?.text || '');
      all.push({ ...base, quote: base.title, author });
    } else if (ast.type === 'three-column') {
      const h3s = ast.content.headings.filter(h => h.level >= 3);
      const allItems = []; for (const list of ast.content.lists) for (const item of list.items) allItems.push(item.text || '');
      const per = Math.ceil(allItems.length / 3);
      const cols = [0,1,2].map(i => ({ title: h3s[i]?.text || '', items: allItems.slice(i*per, (i+1)*per) }));
      all.push({ ...base, cols });
    } else if (ast.type === 'kpi-grid') {
      const table = ast.content.table;
      const kpis = table ? table.rows.slice(0,4).map(r => ({ label: r[0], value: r[1]||'', trend: r[2]||'' })) : [];
      all.push({ ...base, kpis });
    } else if (ast.type === 'image-text') {
      const items = []; for (const list of ast.content.lists) for (const item of list.items) items.push(item.text || '');
      const imgData = (ast.content.images && ast.content.images[0]) ? ast.content.images[0] : { src: '', label: '' };
      all.push({ ...base, items, imgSrc: imgData.src, imgLabel: imgData.label });
    } else if (ast.type === 'image-full') {
      const imgData = (ast.content.images && ast.content.images[0]) ? ast.content.images[0] : { src: '', label: '' };
      all.push({ ...base, subtitle: ast.content.headings[1]?.text || '', imgSrc: imgData.src, imgLabel: imgData.label });
    } else if (ast.type === 'image-gallery') {
      const images = (ast.content.images || []);
      const imgSrcs = images.map(img => img.src || '');
      const labels = images.map(img => img.label || '');
      all.push({ ...base, imgSrcs, labels });
    } else if (ast.type === 'image-grid') {
      const images = (ast.content.images || []);
      const imgSrcs = images.map(img => img.src || '');
      const labels = images.map(img => img.label || '');
      all.push({ ...base, imgSrcs, labels });
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

  const { generate: generatePptScript } = require('../ppt-engine/script');
  const pptScript = generatePptScript({
    slideDataJSON, chartDataJSON, colorsJSON,
    backgroundJSON: config.background ? JSON.stringify(config.background) : 'null',
    slideCount, title: escapeHTML(title),
    svgAsVector: config.export.svgAsVector,
    autoEmbedFonts: config.export.autoEmbedFonts,
    chartSlidesLen: chartSlides ? chartSlides.length : 0,
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
