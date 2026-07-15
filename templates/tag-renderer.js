/**
 * tag-renderer.js — 标签语法通用渲染器
 *
 * 对 tag 解析的幻灯片，所有元素按 style 中的 x/y/w/h 绝对定位。
 * 替代了传统模板的 CSS 流式布局，确保 HTML 像素位置 = PPT 坐标来源。
 */

const { styleToHtml, styleToFontProps, maxFitLines, charsPerLine, truncateText, lineClampCSS } = require('../core/utils/coordinates');
const { esc } = require('./elements/shared/escape');
const { renderInline } = require('./elements/shared/inline');
const headingEl = require('./elements/text/heading');
const paragraphEl = require('./elements/text/paragraph');
const listEl = require('./elements/text/list');
const boxEl = require('./elements/visual/box');
const imageEl = require('./elements/visual/image');
const tableEl = require('./elements/data/table');
const waterfallEl = require('./elements/data/waterfall');
const chartShell = require('./elements/data/chart-shell');

function render(ast, config) {
  const { content } = ast;
  const blocks = content.blocks || [];

  // 幻灯片级背景：根据 type 和 theme 决定
  const slideType = ast.type;
  const theme = ast.props.theme || '';
  const isDarkSlide = slideType === 'title' || slideType === 'section' || slideType === 'ending';
  let slideBg = 'var(--color-bg)';
  if (isDarkSlide) {
    slideBg = '#1a1a2e';
    if (theme === 'gradient') {
      slideBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  const elements = blocks.map((block, i) => {
    const style = block.style || {};
    const posStyle = styleToHtml(style);

    switch (block.tag) {
      case 'h1': case 'h2': case 'h3': case 'h4':
        return headingEl.render(parseInt(block.tag[1]), block.data.text, style);

      case 'p':
        return paragraphEl.render(block.data.text, block.data.inlineMarkup, style);

      case 'list':
        return listEl.render(block.data.items, block.data.ordered, style);

      case 'table':
        return tableEl.render(block.data.headers, block.data.rows, style);

      case 'img':
        return imageEl.render(block.data.src, block.data.label, style);

      case 'box':
        return boxEl.render(style);

      case 'chart': {
        const chartType = style.chartType || style.type || 'bar';
        const id = 'chart-' + ast.index + '-' + i;
        // 瀑布图 → 委托 waterfall 元素
        if (chartType === 'waterfall' || chartType === 'waterfall2') {
          const rows = (block.data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
          const title = block.data.headers ? block.data.headers.slice(1).join('/') : '';
          return waterfallEl.render(rows, title, id, style);
        }
        // 其他图表 → 通用 ECharts
        if (block.data && block.data.headers && block.data.headers.length >= 2) {
          const opt = buildEChartOption(chartType, block.data, style);
          if (opt) return chartShell.render(id, opt, style);
        }
        return chartShell.renderFallback('图表数据不足');
      }

      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  return `<div class="slide slide-tag" style="background:${slideBg};position:relative;width:960px;height:540px;overflow:hidden;">
    ${elements}
  </div>`;
}

// ---- 通用 ECharts option 构建 ----

function buildEChartOption(chartType, tableData, style) {
  if (!tableData || !tableData.headers || tableData.headers.length < 2) return null;
  const cats = tableData.rows.map(r => r[0]);
  const seriesArr = [];
  for (let col = 1; col < tableData.headers.length; col++) {
    seriesArr.push({
      name: tableData.headers[col],
      type: chartType,
      data: tableData.rows.map(r => parseFloat(r[col]) || 0),
    });
  }
  const colors = ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: seriesArr.map(s => s.name), bottom: 0, textStyle: { fontSize: 10 } },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    color: colors,
    series: seriesArr,
  };
}

module.exports = { render };
