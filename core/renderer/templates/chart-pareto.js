/**
 * chart-pareto.js — 帕累托图模板
 *
 * 柱状图（降序排列）+ 折线图（累计百分比）+ 双Y轴。
 * 经典 80/20 分析工具。
 *
 * 表格格式：第一列为类别，第二列为数值。
 *
 * Markdown 示例：
 *   <!-- slide: chart, type=pareto, title=缺陷原因分析 -->
 *   | 原因     | 次数 |
 *   |----------|------|
 *   | 操作失误  | 85   |
 *   | 设计缺陷  | 52   |
 *   | 硬件故障  | 38   |
 *   | 环境因素  | 18   |
 *   | 其他     | 7    |
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_pareto_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast);
  }

  const title = props.title || content.headings[0]?.text || '帕累托图';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 第一列=类别，第二列=数值
  const rawData = table.rows.map(row => ({
    name: row[0],
    value: parseFloat(row[1]) || 0,
  }));

  // 按数值降序排列
  rawData.sort((a, b) => b.value - a.value);

  const total = rawData.reduce((sum, d) => sum + d.value, 0);

  // 计算累计百分比
  let cumulative = 0;
  const categories = [];
  const barValues = [];
  const lineValues = [];
  for (const d of rawData) {
    categories.push(d.name);
    barValues.push(d.value);
    cumulative += d.value;
    lineValues.push(parseFloat(((cumulative / total) * 100).toFixed(1)));
  }

  // 找到 80% 阈值对应的索引
  const threshold80Idx = lineValues.findIndex(v => v >= 80);

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
      formatter: function(params) {
        const bar = params[0];
        const line = params[1];
        return bar.name + '<br/>' +
          bar.seriesName + ': ' + bar.value + '<br/>' +
          line.seriesName + ': ' + line.value + '%';
      }
    },
    legend: { bottom: 8, textStyle: { fontSize: 12 }, data: ['数量', '累计百分比'] },
    grid: { left: '10%', right: '10%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 11, color: '#666', rotate: categories.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        axisLabel: { fontSize: 11, color: '#888' },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      {
        type: 'value',
        name: '累计%',
        min: 0, max: 100,
        axisLabel: { fontSize: 11, color: '#888', formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '数量',
        type: 'bar',
        yAxisIndex: 0,
        data: barValues.map((v, i) => ({
          value: v,
          itemStyle: {
            color: i <= threshold80Idx ? colors[1] : colors[0],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: 50,
        label: { show: true, position: 'top', fontSize: 10, color: '#666' },
      },
      {
        name: '累计百分比',
        type: 'line',
        yAxisIndex: 1,
        data: lineValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colors[2], width: 2.5 },
        itemStyle: { color: colors[2] },
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          color: colors[2],
          formatter: '{c}%',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#e94560', type: 'dashed', width: 1.5 },
          label: { formatter: '80%', fontSize: 11, color: '#e94560' },
          data: [{ yAxis: 80 }],
        },
      },
    ],
  };

  // 计算 80/20 统计信息
  const vitalFew = threshold80Idx >= 0 ? threshold80Idx + 1 : 0;
  const vitalPct = ((vitalFew / categories.length) * 100).toFixed(0);

  return buildChartSlide(chartId, title, echartOption, vitalFew, vitalPct);
}

function renderFallback(ast) {
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;">（需要表格数据来生成帕累托图）</p>
</div>`;
}

function buildChartSlide(chartId, title, option, vitalFew, vitalPct) {
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');

  return `
<div class="slide slide-chart" style="background: #fff; padding: 32px 40px; display: flex; flex-direction: column;">
  <div class="chart-info-tag" style="position: absolute; top: 12px; right: 20px; background: #2ecc71; color: #fff; font-size: 11px; padding: 4px 12px; border-radius: 10px; z-index: 5; font-weight: 600;">
    ✅ SVG 矢量 → PPT 可编辑
  </div>
  <div class="chart-container" id="${chartId}" style="flex: 1; width: 100%; min-height: 0;"></div>
  <div class="pareto-insight" style="position: absolute; bottom: 40px; left: 44px; font-size: 11px; color: #666; background: rgba(255,255,255,0.85); padding: 4px 10px; border-radius: 4px;">
    💡 前 ${vitalFew} 项（占 ${vitalPct}%）贡献了 80% 的结果 — 优先聚焦
  </div>
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
