/**
 * chart-compare.js — 对比柱状图（含增量标注）
 *
 * 每个类别并排显示两根柱子（如去年 vs 今年），差值标注在中间。
 * 正值绿色箭头，负值红色箭头。常用于同比/环比对比。
 *
 * 表格格式：第一列为类别，第二列为左侧值，第三列为右侧值。
 *
 * Markdown 示例：
 *   <!-- slide: chart, type=compare, title=年度业绩对比 -->
 *   | 指标     | 2023 | 2024 |
 *   |----------|------|------|
 *   | 营收(万) | 580  | 680  |
 *   | 用户(万) | 12.8 | 15.2 |
 *   | 客单价   | 456  | 520  |
 *   | NPS     | 68   | 72   |
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_compare_' + index;

  if (!table || !table.headers || table.headers.length < 3) {
    return renderFallback(ast, '需要两列数据（如：去年 + 今年）来生成对比图');
  }

  const title = props.title || content.headings[0]?.text || '对比分析';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  const leftLabel = table.headers[1] || '对比A';
  const rightLabel = table.headers[2] || '对比B';

  // 提取数据
  const categories = [];
  const leftValues = [];
  const rightValues = [];
  const deltas = [];

  for (const row of table.rows) {
    categories.push(row[0]);
    const left = parseFloat(row[1]) || 0;
    const right = parseFloat(row[2]) || 0;
    leftValues.push(left);
    rightValues.push(right);
    deltas.push(right - left);
  }

  // 计算每个类别的差值百分比
  const deltaPcts = deltas.map((d, i) => {
    const base = leftValues[i];
    return base !== 0 ? parseFloat(((d / base) * 100).toFixed(1)) : 0;
  });

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const l = params[0], r = params[1];
        const i = l.dataIndex;
        const d = deltas[i];
        const sign = d >= 0 ? '+' : '';
        const col = d >= 0 ? '#10b981' : '#ef4444';
        return l.name + '<br/>' +
          l.seriesName + ': ' + l.value + '<br/>' +
          r.seriesName + ': ' + r.value + '<br/>' +
          '<span style=\"color:' + col + ';font-weight:bold;\">增量: ' + sign + d + ' (' + sign + deltaPcts[i] + '%)</span>';
      }
    },
    legend: { bottom: 8, textStyle: { fontSize: 12 }, data: [leftLabel, rightLabel] },
    grid: { left: '8%', right: '8%', top: '20%', bottom: '18%' },
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
    series: [
      {
        name: leftLabel,
        type: 'bar',
        data: leftValues.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[0], borderRadius: [4, 0, 0, 0] },
        })),
        barGap: '10%',
        barMaxWidth: 50,
        label: { show: true, position: 'top', fontSize: 10, color: colors[0] },
      },
      {
        name: rightLabel,
        type: 'bar',
        data: rightValues.map((v, i) => ({
          value: v,
          itemStyle: { color: deltas[i] >= 0 ? colors[2] : colors[1], borderRadius: [0, 4, 0, 0] },
        })),
        barMaxWidth: 50,
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#444',
          formatter: function(p) {
            const d = deltas[p.dataIndex];
            const sign = d >= 0 ? '↑' : '↓';
            return sign + Math.abs(d);
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#999', type: 'dashed', width: 1 },
          label: { show: false },
          data: [{ yAxis: 0 }], // 基准线（可选）
        },
      },
    ],
  };

  // 统计摘要
  const totalDelta = deltas.reduce((a, b) => a + b, 0);
  const positiveDeltas = deltas.filter(d => d > 0).length;
  const negativeDeltas = deltas.filter(d => d < 0).length;

  return buildChartSlide(chartId, title, echartOption, leftLabel, rightLabel, totalDelta, positiveDeltas, negativeDeltas);
}

function renderFallback(ast, msg) {
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;">（${msg || '需要表格数据来生成对比图'}）</p>
</div>`;
}

function buildChartSlide(chartId, title, option, leftLabel, rightLabel, totalDelta, posC, negC) {
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');
  const deltaSign = totalDelta >= 0 ? '↑' : '↓';
  const deltaColor = totalDelta >= 0 ? '#10b981' : '#ef4444';
  const summary = `${leftLabel} → ${rightLabel}，综合变化 ${deltaSign}${Math.abs(totalDelta)}（${posC}升 ${negC}降）`;

  return `
<div class="slide slide-chart" style="background: #fff; padding: 30px 40px; display: flex; flex-direction: column;">
  <div class="chart-info-tag" style="position: absolute; top: 12px; right: 20px; background: #2ecc71; color: #fff; font-size: 11px; padding: 4px 12px; border-radius: 10px; z-index: 5; font-weight: 600;">
    ✅ SVG 矢量 → PPT 可编辑
  </div>
  <div class="chart-container" id="${chartId}" style="flex: 1; width: 100%; min-height: 0;"></div>
  <div class="compare-summary" style="position: absolute; bottom: 18px; left: 44px; font-size: 11px; color: ${deltaColor}; background: rgba(255,255,255,0.9); padding: 4px 10px; border-radius: 4px; font-weight: 600;">
    ${summary}
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
