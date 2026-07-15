const { esc } = require('../../elements/shared/escape');
/**
 * chart-bar.html.js — 柱状图模板
 *
 * 从 content.table 提取数据，使用 ECharts SVG 渲染器生成柱状图。
 * 表格格式：第一列为类别标签，其余列为不同的数据系列。
 *
 * 导出到 PPT 后：右键 SVG → "转换为形状" → 每根柱子可独立编辑
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_bar_' + index;

  // 无表格数据时显示占位
  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast);
  }

  const title = props.title || content.headings[0]?.text || '柱状图';
  const categories = table.rows.map(row => row[0]);
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 构建系列数据（跳过第一列 categories）
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
      axisLabel: { fontSize: 12, color: '#666' },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      data: s.values,
      itemStyle: {
        color: s.color,
        borderRadius: [4, 4, 0, 0],
      },
      barMaxWidth: 50,
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        color: '#666',
      },
    })),
  };

  return buildChartSlide(chartId, title, echartOption, '柱状图');
}

function renderFallback(ast) {
  // 回退：显示为普通内容页
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `
<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${esc(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;font-size:15px;">（需要表格数据来生成图表）</p>
</div>`;
}

function buildChartSlide(chartId, title, option, chartType) {
  // 对 option 做安全的 JSON 序列化（避免 </script> 破坏 HTML）
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
  // 响应窗口大小变化
  var ro = new ResizeObserver(function() { chart.resize(); });
  ro.observe(dom);
})();
<\/script>`;
}


module.exports = { render };
