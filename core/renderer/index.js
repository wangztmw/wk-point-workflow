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
const TEMPLATE_REGISTRY = {
  'title':         './templates/title.html.js',
  'content':       './templates/content.html.js',
  'chart':         './templates/chart-bar.html.js',
  'chart-bar':     './templates/chart-bar.html.js',
  'chart-pie':     './templates/chart-pie.html.js',
  'chart-line':    './templates/chart-line.html.js',
  'chart-radar':   './templates/chart-radar.html.js',
  'chart-pareto':  './templates/chart-pareto.js',
  'chart-compare': './templates/chart-compare.js',
  'chart-waterfall': './templates/chart-waterfall.js',
  'chart-waterfall2':'./templates/chart-waterfall2.js',
  'summary':       './templates/summary.html.js',
  'two-column':    './templates/two-column.html.js',
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
    return fs.readFileSync(path.join(__dirname, 'templates', 'base.css'), 'utf-8');
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

<script>
// ============================================================
// 图表数据（从 Markdown 提取，供原生图表导出使用）
// ============================================================
var SLIDE_DATA = ${slideDataJSON};
var SLIDE_CHART_DATA = ${chartDataJSON};
var CHART_COLORS = ${colorsJSON};

// ============================================================
// 导出逻辑
// ============================================================

function setStatus(msg, isError) {
  var el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = isError ? '#e94560' : '#8899aa';
}
function showLoading(s) {
  document.getElementById('loading').classList.toggle('active', s);
}

/** 检测是否是瀑布图类型（dom-to-pptx 无法处理，需走形状拼凑） */
function isWaterfallType(type) {
  return type === 'waterfall' || type === 'waterfall2';
}
function hasWaterfall() {
  return SLIDE_CHART_DATA.some(function(c) { return isWaterfallType(c.chartType); });
}

async function exportDomToPptx() {
  await exportHybridPptx();
}

/** 数据驱动导出：遍历 SLIDE_DATA，按类型走不同渲染 */
function buildPptxFromSlideData() {
  var pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'C16x9', width: 10, height: 5.625 });
  pptx.layout = 'C16x9';
  SLIDE_DATA.forEach(function(s) {
    if (s.type === 'title')           addTitleSlidePptx(pptx, s);
    else if (s.type === 'content')    addContentSlidePptx(pptx, s);
    else if (s.type === 'summary')    addSummarySlidePptx(pptx, s);
    else if (s.type === 'two-column') addTwoColumnSlidePptx(pptx, s);
    else if (s.type === 'chart') {
      if (isWaterfallType(s.chartType)) addWaterfallShapes(pptx, s);
      else addNativeChartSlide(pptx, s);
    }
    else addFallbackSlidePptx(pptx, s);
  });
  return pptx;
}

async function exportHybridPptx() {
  try {
    setStatus('⏳ 混合导出中...'); showLoading(true);
    var pptx = buildPptxFromSlideData();
    await pptx.writeFile({ fileName: '${escapeHTML(title)}.pptx' });
    setStatus('✅ 导出成功！所有页面保留视觉结构');
  } catch (err) { console.error(err); setStatus('❌ ' + err.message, true); }
  finally { showLoading(false); }
}

async function exportNativeChartsPptx() {
  try {
    setStatus('⏳ 构建原生图表中...'); showLoading(true);
    var pptx = buildPptxFromSlideData();
    await pptx.writeFile({ fileName: '${escapeHTML(title)}-native.pptx' });
    setStatus('✅ 导出成功！');
  } catch (err) { console.error(err); setStatus('❌ ' + err.message, true); }
  finally { showLoading(false); }
}

// ============================================================
// ★ 瀑布图形状拼凑 ★
// 每根柱子 = 独立 PptxGenJS 矩形，虚线连接累计值
// ============================================================

function addWaterfallShapes(pptx, info) {
  var slide = pptx.addSlide();
  var chartX = 0.8, chartW = 8.5;
  var chartY = 1.0, chartH = 4.2;
  var catCount = info.categories.length;
  var stepX = chartW / catCount;
  var barW = stepX * 0.55;
  var gapX = (stepX - barW) / 2;

  // 判断合计行
  function isSubtotalRow(name) { return /合计|小计|汇总|总计/.test(name); }

  // 计算最大值（考虑分段累计）
  var vals = info.series[0].values;
  var cats = info.categories;
  var maxAbs = Math.abs(vals[0]);
  var cumVal = vals[0], cumMax = cumVal;
  for (var j = 1; j < vals.length - 1; j++) {
    if (isSubtotalRow(cats[j])) { cumVal = vals[j]; if (cumVal > cumMax) cumMax = cumVal; continue; }
    cumVal += vals[j];
    if (cumVal > cumMax) cumMax = cumVal;
    if (Math.abs(vals[j]) > maxAbs) maxAbs = Math.abs(vals[j]);
  }
  if (vals[vals.length - 1] > cumMax) cumMax = vals[vals.length - 1];
  maxAbs = Math.ceil(Math.max(maxAbs, cumMax) * 1.08);

  function toY(val) { return (val / maxAbs) * chartH; }
  function yPos(val) { return chartY + chartH - toY(val); }

  // 标题
  if (info.title) {
    slide.addText(info.title, { x: 0.5, y: 0.3, w: 9, h: 0.45, fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  }

  var runningTotal = 0;
  var prevConnectY = 0;

  for (var i = 0; i < catCount; i++) {
    var val = info.series[0].values[i];
    var cat = info.categories[i];
    var cx = chartX + i * stepX + gapX;

    var isFirst = (i === 0);
    var isLast = (i === catCount - 1);
    var isSub = isSubtotalRow(cat);  // 中间合计行

    var barBottomY, barH, barColor;

    if (isFirst) {
      var startVal = Math.abs(val);
      barBottomY = yPos(startVal);
      barH = toY(startVal);
      barColor = '4472C4';
      runningTotal = val;
    } else if (isLast) {
      barBottomY = yPos(val);
      barH = toY(val);
      barColor = 'ED7D31';
    } else if (isSub) {
      // ★ 中间合计柱：全高落地，重置累计
      barBottomY = yPos(val);
      barH = toY(val);
      barColor = '8B5CF6';  // 紫色
      runningTotal = val;
    } else {
      var delta = val;
      if (delta >= 0) {
        barBottomY = yPos(runningTotal + delta);
        barH = toY(delta);
        barColor = '70AD47';
      } else {
        barBottomY = yPos(runningTotal);
        barH = toY(Math.abs(delta));
        barColor = 'ED7D31';
      }
      runningTotal += delta;
    }

    // ★ 画柱子
    slide.addShape('rect', {
      x: cx, y: barBottomY, w: barW, h: Math.max(barH, 0.04),
      fill: { color: barColor },
      rectRadius: barW > 0.3 ? 0.04 : 0.02,
      line: { color: 'FFFFFF', width: 0.3 },
    });

    // 标签
    var labelY = barBottomY - 0.22;
    var labelText = (isFirst || isLast) ? String(val) : (val >= 0 ? '+' + val : String(val));
    slide.addText(labelText, {
      x: cx - 0.05, y: labelY, w: barW + 0.1, h: 0.2,
      fontSize: Math.min(barW * 28, 9), align: 'center',
      color: '333333', fontFace: 'Arial', bold: true,
    });

    // ★ 虚线连接：增量/落地柱连顶部，减量柱连底部
    var connectY;
    if (isFirst || isLast || isSub) {
      connectY = barBottomY;           // 落地柱：顶部平齐
    } else if (val >= 0) {
      connectY = barBottomY;           // 增量柱：顶部平齐（新累计值在顶部）
    } else {
      connectY = barBottomY + barH;    // 减量柱：底部平齐（新累计值在底部）
    }
    if (i > 0) {
      slide.addShape('line', {
        x: chartX + (i - 1) * stepX + gapX + barW / 2,
        y: prevConnectY,
        w: stepX,
        h: 0,
        line: { color: '999999', width: 1.0, dashType: 'dash' },
      });
    }
    prevConnectY = connectY;

    // X 轴标签
    slide.addText(cat, {
      x: cx - 0.2, y: chartY + chartH + 0.04, w: barW + 0.4, h: 0.22,
      fontSize: 8, align: 'center', color: '666666', fontFace: 'Microsoft YaHei',
    });
  }

  // Y 轴刻度标签（只保留数字，不画背景网格线）
  var numTicks = 4;
  for (var t = 0; t <= numTicks; t++) {
    var tickVal = Math.round((maxAbs / numTicks) * t);
    var tickY = yPos(tickVal);
    slide.addText(String(tickVal), {
      x: chartX - 0.55, y: tickY - 0.1, w: 0.5, h: 0.18,
      fontSize: 8, align: 'right', color: '888888', fontFace: 'Arial',
    });
  }

  // 横轴基准线（y=0）
  var baseY = yPos(0);
  slide.addShape('line', {
    x: chartX, y: baseY, w: chartW, h: 0,
    line: { color: '999999', width: 1.2 },
  });
  // 竖轴（左边界）
  slide.addShape('line', {
    x: chartX, y: chartY, w: 0, h: chartH,
    line: { color: '999999', width: 1.2 },
  });

  // 脚注
  slide.addText('✅ 每根柱子 = 独立矩形，可拖拽/缩放/改色', {
    x: chartX, y: chartY + chartH + 0.3, w: 8, h: 0.2,
    fontSize: 8, color: '2ecc71', fontFace: 'Microsoft YaHei',
  });
}

/** 添加原生图表幻灯片 */
function addNativeChartSlide(pptx, info) {
  var slide = pptx.addSlide();

  // 标题
  if (info.title) {
    slide.addText(info.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.45,
      fontSize: 20, bold: true, color: '333333',
      fontFace: 'Microsoft YaHei',
    });
  }

  // 图表类型映射
  var typeMap = {
    bar: 'BAR', line: 'LINE', pie: 'PIE', doughnut: 'DOUGHNUT',
    radar: 'RADAR', scatter: 'SCATTER', area: 'AREA'
  };
  var ct = info.chartType || info.type || 'bar';
  var pptxType = typeMap[ct] || 'BAR';

  // 构建数据
  var chartData = info.series.map(function(s) {
    return { name: s.name, labels: info.categories, values: s.values };
  });

  var isPieType = ct === 'pie' || ct === 'doughnut';
  var numSeries = info.series.length;
  var seriesColors = isPieType
    ? CHART_COLORS.slice(0, info.series[0].values.length)
    : CHART_COLORS.slice(0, numSeries);

  slide.addChart(pptx.charts[pptxType], chartData, {
    x: 0.6, y: 0.9, w: 8.8, h: 4.2,
    showTitle: false,
    showLegend: numSeries > 1 || isPieType,
    legendPos: 'b', legendFontSize: 10,
    showValue: true,
    dataLabelPosition: isPieType ? 'outEnd' : 'outEnd',
    dataLabelColor: '333333', dataLabelFontSize: 9,
    chartColors: seriesColors,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    lineSize: ct === 'line' ? 2 : undefined,
    lineSmooth: ct === 'line' ? true : undefined,
    barGrouping: ct === 'bar' ? 'clustered' : undefined,
    barGapWidthPct: ct === 'bar' ? 80 : undefined,
  });

  // 脚注
  slide.addText('✅ 原生 OOXML 图表 — 双击可编辑数据表，每根柱子/扇区独立可编辑', {
    x: 0.6, y: 5.2, w: 8.8, h: 0.25,
    fontSize: 8, color: '2ecc71', fontFace: 'Microsoft YaHei',
  });
}

// ============================================================
// 非图表页 PptxGenJS 渲染（数据驱动，保留视觉结构）
// ============================================================

function addTitleSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.background = { fill: '1a1a2e' };
  if (s.title) slide.addText(s.title, { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 2.6, w: 9, h: 0.6, fontSize: 18, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei' });
}

function addContentSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  var y = 0.4;
  if (s.title) {
    slide.addText(s.title, { x: 0.6, y: y, w: 8.8, h: 0.5, fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    y += 0.5;
    slide.addShape('rect', { x: 0.6, y: y, w: 0.9, h: 0.06, fill: { color: '667eea' } });
    y += 0.35;
  }
  if (s.items) {
    s.items.forEach(function(item) {
      if (y > 5.0) return;
      var runs = [{ text: '▸  ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: 0.8, y: y, w: 8.4, h: 0.32, fontSize: 13, color: '444444', fontFace: 'Microsoft YaHei' });
      y += 0.3;
    });
  }
  if (s.subHeadings) {
    s.subHeadings.forEach(function(h) {
      if (y > 5.0) return;
      slide.addText(h.text, { x: 0.6, y: y, w: 8.8, h: 0.35, fontSize: h.level === 3 ? 16 : 14, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
      y += 0.32;
    });
  }
}

function addSummarySlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  if (!s.cards || s.cards.length === 0) return;
  var cols = s.cards.length <= 2 ? 2 : 3;
  var cardW = 8.6 / cols, cardH = 4.0, cardY = 0.95;
  var colors = ['4472C4', 'ED7D31', '70AD47'];
  s.cards.forEach(function(card, i) {
    var cx = 0.5 + i * (cardW + 0.2);
    slide.addShape('rect', { x: cx, y: cardY, w: cardW, h: cardH, fill: { color: 'F5F7FF' }, rectRadius: 0.08, line: { color: 'E0E0E0', width: 0.5 } });
    var isWarn = card.title.indexOf('⚠')>=0 || card.title.indexOf('关注')>=0 || card.title.indexOf('挑战')>=0;
    var isGood = card.title.indexOf('✅')>=0 || card.title.indexOf('达成')>=0 || card.title.indexOf('计划')>=0 || card.title.indexOf('优势')>=0;
    var borderColor = isWarn ? 'FFC000' : (isGood ? '70AD47' : colors[i % colors.length]);
    slide.addShape('rect', { x: cx, y: cardY, w: 0.06, h: cardH, fill: { color: borderColor } });
    slide.addText(card.title, { x: cx + 0.2, y: cardY + 0.12, w: cardW - 0.3, h: 0.35, fontSize: 14, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    var iy = cardY + 0.55;
    (card.items || []).forEach(function(item) {
      if (iy > cardY + cardH - 0.2) return;
      var runs = [{ text: '• ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: cx + 0.25, y: iy, w: cardW - 0.4, h: 0.28, fontSize: 10, color: '555555', fontFace: 'Microsoft YaHei' });
      iy += 0.25;
    });
  });
}

function addTwoColumnSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  function renderCol(col, cx, color) {
    slide.addShape('rect', { x: cx, y: 0.95, w: 4.2, h: 3.8, fill: { color: 'F5F7FF' }, rectRadius: 0.06 });
    slide.addShape('rect', { x: cx, y: 0.95, w: 0.06, h: 3.8, fill: { color: color } });
    if (col.title) slide.addText(col.title, { x: cx + 0.2, y: 1.05, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    var iy = 1.55;
    (col.items || []).forEach(function(item) {
      if (iy > 4.5) return;
      var runs = [{ text: '▸ ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: cx + 0.25, y: iy, w: 3.7, h: 0.32, fontSize: 12, color: '444444', fontFace: 'Microsoft YaHei' });
      iy += 0.3;
    });
  }
  if (s.left) renderCol(s.left, 0.5, '4472C4');
  if (s.right) renderCol(s.right, 5.1, 'ED7D31');
}

function addFallbackSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  if (s.title) slide.addText(s.title, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 24, bold: true, color: '333333', align: 'center', fontFace: 'Microsoft YaHei' });
}

/** 非图表页：文本提取（旧版兼容，不再使用） */
function addTextSlide(pptx, slideEl, idx) {
  var s = pptx.addSlide();
  var blocks = extractTextBlocks(slideEl);
  if (blocks.length === 0) {
    s.addText('[ 第 ' + (idx+1) + ' 页 ]', {
      x: 0.5, y: 2.5, w: 9, h: 0.6, fontSize: 14, color: '999999', align: 'center'
    });
    return;
  }
  var y = 0.35;
  blocks.forEach(function(b) {
    var fs = 12, bold = false;
    if (b.tag === 'H1') { fs = 30; bold = true; }
    else if (b.tag === 'H2') { fs = 20; bold = true; }
    else if (b.tag === 'H3') { fs = 16; bold = true; }
    var h = Math.max(0.28, fs * 0.02 * Math.ceil(b.text.length / 70) + 0.04);
    if (y + h > 5.2) return;
    s.addText(b.text, {
      x: 0.6, y: y, w: 8.8, h: h,
      fontSize: fs, bold: bold,
      color: b.tag.match(/^H\\d$/) ? '1a1a2e' : '333333',
      fontFace: 'Microsoft YaHei', valign: 'top',
    });
    y += h + 0.03;
  });
}

function extractTextBlocks(el) {
  var blocks = [];
  function walk(node) {
    if (!node || !node.tagName) return;
    var tag = node.tagName.toUpperCase();
    if (['SCRIPT','STYLE','NOSCRIPT','SVG','IFRAME','CANVAS'].indexOf(tag) !== -1) return;
    var ownText = (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3)
      ? (node.textContent || '').trim() : '';
    var hasChildren = Array.from(node.children).length > 0;
    if (ownText && ownText.length > 0 && !hasChildren) {
      blocks.push({ text: ownText.substring(0, 400), tag: tag });
      return;
    }
    Array.from(node.children).forEach(function(c) { walk(c); });
  }
  walk(el);
  return blocks;
}

console.log('%c✅ MD→HTML 已就绪 %c| %c' + ${slideCount} + ' 页 %c| %c图表: ' + (chartSlides ? chartSlides.length : 0) + ' 个',
  'font-size:14px;color:#667eea;', '', 'color:#888;', '', 'color:#2ecc71;');
console.log('%c📌 "导出 PPTX" → PptxGenJS 数据驱动导出，图表=原生OOXML，瀑布图=独立形状，文本页=富文本保留粗体', 'color:#2ecc71;');
</script>
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
