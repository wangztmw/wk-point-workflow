/**
 * chart-pie.html.js — 饼图/环形图模板
 *
 * 从 content.table 提取数据，使用 ECharts SVG 渲染器生成饼图。
 * 表格格式：第一列为标签，第二列为数值。
 * 超过 1 列数据时自动使用环形图（doughnut）多系列模式。
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_pie_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast);
  }

  const title = props.title || content.headings[0]?.text || '饼图';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 构建饼图数据：第一列 label，第二列 value
  const pieData = table.rows.map((row, i) => ({
    name: row[0],
    value: parseFloat(row[1]) || 0,
    itemStyle: { color: colors[i % colors.length] },
  }));

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      bottom: 8,
      textStyle: { fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['38%', '62%'],  // 环形图
      center: ['50%', '50%'],
      data: pieData,
      label: {
        fontSize: 11,
        formatter: '{b}\n{d}%',
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
    }],
  };

  return buildChartSlide(chartId, title, echartOption);
}

function renderFallback(ast) {
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `
<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;font-size:15px;">（需要表格数据来生成图表）</p>
</div>`;
}

function buildChartSlide(chartId, title, option) {
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');

  return `
<div class="slide slide-chart" style="background: #fff; padding: 36px 44px; display: flex; flex-direction: column;">
  <div class="chart-info-tag" style="position: absolute; top: 12px; right: 20px; background: #2ecc71; color: #fff; font-size: 11px; padding: 4px 12px; border-radius: 10px; z-index: 5; font-weight: 600;">
    ✅ SVG 矢量 → PPT 可编辑
  </div>
  <div class="chart-container" id="${chartId}" style="flex: 1; width: 100%; min-height: 0;"></div>
</div>
<script>
(function() {
  var dom = document.getElementById('${chartId}');
  if (!dom) return;
  var chart = echarts.init(dom, null, { renderer: 'svg' });
  chart.setOption(${optJSON});
  var ro = new ResizeObserver(function() { chart.resize(); });
  ro.observe(dom);
})();
<\/script>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { render };
