/**
 * waterfall.js — 瀑布图元素（从全页模板提取为可嵌入组件）
 *
 * render(rows, colors, chartId) → ECharts 瀑布图 HTML
 * rows: [{name, value}, ...] — 第一行=起始，最后行=结束，中间=增减
 */
const chartShell = require('./chart-shell');

function render(rows, colors, chartId, style) {
  if (!rows || rows.length < 3) {
    return chartShell.renderFallback('瀑布图数据不足');
  }

  const cats = [];
  const base = [];     // 透明底座
  const increase = []; // 绿色增条
  const decrease = []; // 红色减条
  const linePts = [];  // 虚线连接点

  let cumulative = 0;
  rows.forEach((row, i) => {
    cats.push(row.name);
    const v = row.value || 0;

    if (i === 0) {
      // 起始值：底座=0, 用绿色柱显示
      base.push(0);
      increase.push(v);
      decrease.push('-');
      cumulative = v;
      linePts.push(v);
    } else if (i === rows.length - 1) {
      // 结束值：底座=0, 用绿色柱显示
      base.push(0);
      increase.push(cumulative);
      decrease.push('-');
      linePts.push(cumulative);
    } else {
      // 中间变化
      if (v >= 0) {
        base.push(cumulative);
        increase.push(v);
        decrease.push('-');
      } else {
        base.push(cumulative + v);
        increase.push('-');
        decrease.push(-v);
      }
      cumulative += v;
      linePts.push(cumulative);
    }
  });

  const colorsArr = colors || ['667eea', 'e94560', '2ecc71', 'f39c12', '95a5a6'];

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function(params) {
        // Will be re-attached after JSON parse
        return params.map(function(p) {
          if (p.seriesName === '底座' || p.value === '-') return '';
          return p.name + '<br/>' + p.marker + p.seriesName + ': ' + p.value;
        }).join('');
      }
    },
    legend: { data: ['增加', '减少', '底座'], bottom: 0, textStyle: { fontSize: 10 } },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 9, rotate: cats.length > 5 ? 30 : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    color: ['#' + colorsArr[2], '#' + colorsArr[1], 'transparent'],
    series: [
      { name: '底座', type: 'bar', stack: 'waterfall', data: base,
        itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } } },
      { name: '增加', type: 'bar', stack: 'waterfall', data: increase,
        itemStyle: { color: '#' + colorsArr[2] } },
      { name: '减少', type: 'bar', stack: 'waterfall', data: decrease,
        itemStyle: { color: '#' + colorsArr[1] } },
    ],
  };

  return chartShell.render(chartId || 'waterfall_' + Date.now(), option, style || {});
}

module.exports = { render };
