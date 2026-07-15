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

      case 'table': {
        const table = block.data;
        if (!table || !table.headers) return '';
        const fp = styleToFontProps(style, 'table');
        const headerRow = `<tr>${table.headers.map(h =>
          `<th style="border-bottom:2px solid #1a1a1a;padding:4px 8px;font-size:${fp.fontSize}px;color:#${fp.color};font-weight:600;">${esc(h)}</th>`
        ).join('')}</tr>`;
        const dataRows = table.rows.map((row, ri) =>
          `<tr>${row.map(c =>
            `<td style="border-bottom:1px solid #e0e0e0;padding:4px 8px;font-size:${fp.fontSize-1}px;color:#555;">${esc(c)}</td>`
          ).join('')}</tr>`
        ).join('');
        return `<div style="${posStyle};overflow:auto;">
          <table style="width:100%;border-collapse:collapse;font-family:inherit;"><thead>${headerRow}</thead><tbody>${dataRows}</tbody></table>
        </div>`;
      }

      case 'img': {
        const src = block.data.src || '';
        const label = block.data.label || '';
        const hasImage = src && src.length > 100;
        const w = style.w || 400;
        const h = style.h || 300;
        if (hasImage) {
          return `<div style="${posStyle};display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${esc(src)}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${esc(label)}">
          </div>`;
        }
        return `<div style="${posStyle};display:flex;align-items:center;justify-content:center;border:2px dashed #ddd;background:#fafafa;">
          <div style="font-size:${Math.min(w,h)*0.04}px;font-weight:600;color:#999;text-align:center;">${esc(label)}</div>
        </div>`;
      }

      case 'box': {
        const fillColor = style['fill-color'] || '';
        const borderColor = style['border-color'] || '';
        const borderWidth = style['border-width'] || 0;
        const borderRadius = style['border-radius'] || 0;
        const bg = fillColor ? `background:#${fillColor};` : '';
        const bd = borderColor ? `border:${borderWidth}px solid #${borderColor};` : '';
        const br = borderRadius ? `border-radius:${borderRadius}px;` : '';
        return `<div style="${posStyle};${bg}${bd}${br}"></div>`;
      }

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
