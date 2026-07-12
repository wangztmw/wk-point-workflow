/**
 * chart-radar.html.js — 雷达图模板
 *
 * 表格格式：第一列为维度标签，其余列为不同系列。
 * 每个系列渲染为独立的雷达多边形。
 *
 * Markdown 示例：
 *   <!-- slide: chart, type=radar, title=能力评估 -->
 *   | 维度   | 产品A | 产品B |
 *   |--------|-------|-------|
 *   | 性能   | 92    | 75    |
 *   | 稳定性 | 88    | 90    |
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_radar_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast);
  }

  const title = props.title || content.headings[0]?.text || '雷达图';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 构建指标
  const indicators = table.rows.map(row => ({
    name: row[0],
    max: Math.max(...row.slice(1).map(v => parseFloat(v) || 0)) * 1.3 || 100,
  }));

  // 构建系列
  const series = [];
  for (let col = 1; col < table.headers.length; col++) {
    series.push({
      name: table.headers[col],
      values: table.rows.map(row => parseFloat(row[col]) || 0),
      color: colors[(col - 1) % colors.length],
    });
  }

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: {},
    legend: { bottom: 8, textStyle: { fontSize: 12 }, data: series.map(s => s.name) },
    radar: {
      center: ['50%', '48%'],
      radius: '60%',
      indicator: indicators,
      axisName: { fontSize: 11, color: '#555' },
    },
    series: series.map(s => ({
      name: s.name,
      type: 'radar',
      data: [{ value: s.values, name: s.name }],
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: s.color, width: 2 },
      areaStyle: { color: s.color + '20' },
      itemStyle: { color: s.color },
    })),
  };

  return buildChartSlide(chartId, title, echartOption);
}

function renderFallback(ast) {
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;">（需要表格数据来生成雷达图）</p>
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
