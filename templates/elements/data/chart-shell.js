/**
 * chart-shell.js — ECharts 图表容器（消灭 8 处重复）
 *
 * render(chartId, echartsOption, style) → 完整图表 HTML（容器 + init 脚本）
 * renderFallback(title) → 无数据时的占位页
 */
const { esc } = require('../shared/escape');
const { styleToHtml } = require('../../../core/utils/coordinates');

function render(chartId, option, style) {
  const s = style || {};
  const pos = styleToHtml(s);
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');

  return `<div style="${pos};">
    <div style="position:absolute;top:4px;right:8px;background:#2ecc71;color:#fff;font-size:10px;padding:2px 10px;z-index:5;font-weight:600;">SVG矢量</div>
    <div id="${esc(chartId)}" style="width:100%;height:100%;"></div>
  </div>
<script>
(function(){
  var dom=document.getElementById('${esc(chartId)}');
  if(!dom)return;
  var chart=echarts.init(dom,null,{renderer:'svg'});
  chart.setOption(${optJSON});
  new ResizeObserver(function(){chart.resize();}).observe(dom);
})();
<\/script>`;
}

function renderFallback(title) {
  return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;">
  <div class="section-title">${esc(title||'图表')}</div><div class="divider"></div>
  <p style="color:#999;font-size:15px;">（需要表格数据来生成图表）</p></div>`;
}

module.exports = { render, renderFallback };
