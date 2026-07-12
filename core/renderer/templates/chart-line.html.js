/**
 * chart-line.html.js — 折线图模板
 *
 * 从 content.table 提取数据，使用 ECharts SVG 渲染器生成折线图。
 * 表格格式：第一列为 X 轴类别，其余列为不同的数据系列。
 * 特点：平滑曲线 + 半透明面积填充 + 数据点标记
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_line_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast);
  }

  const title = props.title || content.headings[0]?.text || '折线图';
  const categories = table.rows.map(row => row[0]);
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 构建系列数据
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
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 8,
      textStyle: { fontSize: 12 },
      data: series.map(s => s.name),
    },
    grid: { left: '8%', right: '6%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLabel: { fontSize: 12, color: '#666' },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: s.color, width: 3 },
      itemStyle: { color: s.color },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: s.color + '40' },
            { offset: 1, color: s.color + '05' },
          ],
        },
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        color: '#666',
        formatter: '{c}',
      },
    })),
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
