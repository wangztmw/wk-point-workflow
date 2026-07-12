/**
 * exporter.js — PptxGenJS 原生图表导出器
 *
 * 从 SlideAST[] 直接构建 PptxGenJS 演示文稿，生成原生 OOXML 图表。
 * 复用 native-export.js 的核心逻辑，改为从 AST 接收数据。
 *
 * 特点：
 *   - slide.addChart() 生成 OOXML <c:chart> 原生图表
 *   - 每根柱子/每个扇区在 PPT 中独立可编辑
 *   - 双击图表打开内嵌数据表编辑数值
 *   - 纯 Node.js，无需浏览器
 */

const PptxGenJS = require('pptxgenjs');

// 布局常量（16:9，英寸）
const LAYOUT = { width: 10, height: 5.625 };
const MARGIN = { left: 0.6, right: 0.4, top: 0.5, bottom: 0.4 };

// 图表类型映射
const CHART_TYPE_MAP = {
  'bar': 'BAR',
  'line': 'LINE',
  'pie': 'PIE',
  'doughnut': 'DOUGHNUT',
  'scatter': 'SCATTER',
  'radar': 'RADAR',
  'area': 'AREA',
};

// 默认颜色（无 # 号，PptxGenJS 格式）
const DEFAULT_COLORS = ['4472C4', 'ED7D31', '70AD47', 'FFC000', 'A5A5A5'];

// ============================================================
// 主入口
// ============================================================

/**
 * 从 SlideAST 数组构建原生图表的 PPTX
 * @param {SlideAST[]} slides
 * @param {Object} config - 项目配置
 * @returns {PptxGenJS} pptx 实例
 */
function buildNativePPTX(slides, config) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CUSTOM_16x9', width: LAYOUT.width, height: LAYOUT.height });
  pptx.layout = 'CUSTOM_16x9';

  const colors = config.chartColors
    ? config.chartColors.map(c => c.replace('#', ''))
    : DEFAULT_COLORS;

  for (const ast of slides) {
    switch (ast.type) {
      case 'title':
        addTitleSlide(pptx, ast, config);
        break;
      case 'chart':
        addChartSlide(pptx, ast, colors);
        break;
      case 'content':
      case 'summary':
      case 'two-column':
      default:
        addContentSlide(pptx, ast);
        break;
    }
  }

  return pptx;
}

/**
 * 导出为 PPTX 文件
 * @param {SlideAST[]} slides
 * @param {Object} config
 * @param {string} outputPath
 */
async function exportToFile(slides, config, outputPath) {
  const pptx = buildNativePPTX(slides, config);
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

// ============================================================
// 幻灯片构建函数
// ============================================================

function addTitleSlide(pptx, ast, config) {
  const slide = pptx.addSlide();
  const { content } = ast;
  const mainTitle = content.headings[0]?.text || config.title || '';
  const subTitle = content.headings[1]?.text || '';

  // 深色背景
  slide.background = { fill: '1a1a2e' };

  slide.addText(mainTitle, {
    x: 0.5, y: 1.6, w: 9.0, h: 1.0,
    fontSize: 36, bold: true, color: 'FFFFFF',
    align: 'center', fontFace: 'Microsoft YaHei',
  });

  if (subTitle) {
    slide.addText(subTitle, {
      x: 0.5, y: 2.6, w: 9.0, h: 0.6,
      fontSize: 18, color: 'CCCCDD',
      align: 'center', fontFace: 'Microsoft YaHei',
    });
  }

  // 标签
  if (content.paragraphs.length > 0) {
    const tags = content.paragraphs.map(p => p.text).join('  |  ');
    slide.addText(tags, {
      x: 0.5, y: 3.5, w: 9.0, h: 0.5,
      fontSize: 12, color: '2ecc71',
      align: 'center', fontFace: 'Microsoft YaHei',
    });
  }
}

function addChartSlide(pptx, ast, colors) {
  const slide = pptx.addSlide();
  const { content, props } = ast;
  const table = content.table;

  if (!table || !table.headers || table.headers.length < 2) {
    // 无数据时回退到文本页
    addContentSlide(pptx, ast);
    return;
  }

  const title = props.title || content.headings[0]?.text || '图表';
  const chartTypeName = (props.chartType || props.type || 'bar').toLowerCase();
  const pptxChartType = CHART_TYPE_MAP[chartTypeName] || 'BAR';

  // 构建 PptxGenJS 图表数据格式
  const categories = table.rows.map(row => row[0]);
  const seriesData = [];

  for (let col = 1; col < table.headers.length; col++) {
    seriesData.push({
      name: table.headers[col],
      labels: categories,
      values: table.rows.map(row => parseFloat(row[col]) || 0),
    });
  }

  // 标题
  slide.addText(title, {
    x: MARGIN.left, y: MARGIN.top, w: 9, h: 0.5,
    fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
  });

  // 图表区域
  const rect = {
    x: MARGIN.left,
    y: MARGIN.top + 0.55,
    w: LAYOUT.width - MARGIN.left - MARGIN.right,
    h: LAYOUT.height - MARGIN.top - MARGIN.bottom - 0.6,
  };

  const isSingleSeries = seriesData.length === 1;
  const chartColors = isSingleSeries && (chartTypeName === 'pie' || chartTypeName === 'doughnut')
    ? colors.slice(0, seriesData[0].values.length)
    : colors.slice(0, seriesData.length);

  slide.addChart(pptx.charts[pptxChartType], seriesData, {
    ...rect,
    showTitle: false,
    showLegend: seriesData.length > 1 || chartTypeName === 'pie',
    legendPos: 'b',
    legendFontSize: 10,
    showValue: true,
    dataLabelPosition: (chartTypeName === 'pie' || chartTypeName === 'doughnut') ? 'outEnd' : 'outEnd',
    dataLabelColor: '333333',
    dataLabelFontSize: 9,
    chartColors: chartColors,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
    catAxisTitle: chartTypeName === 'bar' ? '' : '',
    lineSize: chartTypeName === 'line' ? 2 : undefined,
    lineSmooth: chartTypeName === 'line' ? true : undefined,
    barGrouping: chartTypeName === 'bar' ? 'clustered' : undefined,
    barGapWidthPct: chartTypeName === 'bar' ? 80 : undefined,
  });

  // 数据来源标注
  slide.addText('✅ 原生 OOXML 图表 — 每根柱子/扇区独立可编辑，双击可编辑数据表', {
    x: MARGIN.left, y: LAYOUT.height - 0.35, w: 9, h: 0.25,
    fontSize: 8, color: '2ecc71', fontFace: 'Microsoft YaHei',
  });
}

function addContentSlide(pptx, ast) {
  const slide = pptx.addSlide();
  const { content } = ast;

  const title = content.headings[0]?.text || '';
  let y = 0.35;

  if (title) {
    slide.addText(title, {
      x: MARGIN.left, y: y, w: 9, h: 0.5,
      fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });
    y += 0.55;
  }

  // 列表
  for (const list of content.lists) {
    for (const item of list.items) {
      const text = item.text || '';
      if (y > 5.0) break;
      slide.addText(`▸  ${text}`, {
        x: MARGIN.left + 0.3, y: y, w: 8.7, h: 0.35,
        fontSize: 13, color: '444444', fontFace: 'Microsoft YaHei',
      });
      y += 0.32;
    }
  }

  // 次级标题
  for (let i = 1; i < content.headings.length; i++) {
    const h = content.headings[i];
    if (y > 5.0) break;
    slide.addText(h.text, {
      x: MARGIN.left, y: y, w: 9, h: 0.35,
      fontSize: h.level === 2 ? 16 : 14,
      bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });
    y += 0.35;
  }

  // 段落
  for (const p of content.paragraphs) {
    if (y > 5.0) break;
    slide.addText(p.text, {
      x: MARGIN.left, y: y, w: 9, h: 0.3,
      fontSize: 12, color: '555555', fontFace: 'Microsoft YaHei',
    });
    y += 0.28;
  }
}

// ============================================================
// 导出
// ============================================================

module.exports = { buildNativePPTX, exportToFile, CHART_TYPE_MAP, DEFAULT_COLORS };
