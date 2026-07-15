/**
 * tag-renderer.js — 标签语法通用渲染器
 *
 * 对 tag 解析的幻灯片，所有元素按 style 中的 x/y/w/h 绝对定位。
 * 替代了传统模板的 CSS 流式布局，确保 HTML 像素位置 = PPT 坐标来源。
 */

const { styleToHtml, styleToFontProps, maxFitLines, charsPerLine, truncateText, lineClampCSS } = require('../utils/coordinates');
const { esc } = require('./elements/shared/escape');
const { renderInline } = require('./elements/shared/inline');
const headingEl = require('./elements/text/heading');
const paragraphEl = require('./elements/text/paragraph');
const listEl = require('./elements/text/list');
const boxEl = require('./elements/visual/box');
const imageEl = require('./elements/visual/image');
const tableEl = require('./elements/data/table');

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
        return `<div style="${posStyle};">
          <div id="${esc(id)}" style="width:100%;height:100%;"></div>
          ${buildChartScript(id, chartType, block.data, style)}
        </div>`;
      }

      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  return `<div class="slide slide-tag" style="background:${slideBg};position:relative;width:960px;height:540px;overflow:hidden;">
    ${elements}
  </div>`;
}

// ---- ECharts 图表脚本 ----

function buildChartScript(id, chartType, tableData, style) {
  if (!tableData || !tableData.headers || tableData.headers.length < 2) {
    return `<div style="color:#999;text-align:center;padding-top:40px;">（缺少图表数据）</div>`;
  }
  const categories = JSON.stringify(tableData.rows.map(r => r[0]));
  const seriesArr = [];
  for (let col = 1; col < tableData.headers.length; col++) {
    seriesArr.push({
      name: tableData.headers[col],
      type: chartType,
      data: tableData.rows.map(r => parseFloat(r[col]) || 0),
    });
  }
  const colors = ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];
  const seriesColors = seriesArr.map((s, i) => colors[i % colors.length]);

  return `<script>
(function(){
  var dom=document.getElementById('${id}');
  if(!dom)return;
  var chart=echarts.init(dom,null,{renderer:'svg'});
  chart.setOption({
    tooltip:{trigger:'axis'},
    legend:{data:${JSON.stringify(seriesArr.map(s=>s.name))},bottom:0,textStyle:{fontSize:10}},
    grid:{left:50,right:20,top:20,bottom:40},
    xAxis:{type:'category',data:${categories},axisLabel:{fontSize:9}},
    yAxis:{type:'value',axisLabel:{fontSize:9}},
    color:${JSON.stringify(colors)},
    series:${JSON.stringify(seriesArr)}
  });
  new ResizeObserver(function(){chart.resize();}).observe(dom);
})();
<\/script>`;
}

module.exports = { render };
