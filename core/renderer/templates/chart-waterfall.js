/**
 * chart-waterfall.js — 瀑布图（阶梯图/桥图）
 *
 * 展示起始值如何通过一系列增减变化到达最终值。
 * 浮动柱子 + 虚线连接 + 自动计算累计值。
 *
 * 表格格式：第一列为阶段名称，第二列为变化值（正=增加，负=减少，第一行=起始值，最后行=最终值）
 *
 * Markdown 示例：
 *   <!-- slide: chart, type=waterfall, title=营收变化分析 -->
 *   | 阶段       | 金额 |
 *   |------------|------|
 *   | 年初营收    | 500  |
 *   | 新产品收入  | +120 |
 *   | 存量增长    | +80  |
 *   | 客户流失    | -45  |
 *   | 成本优化    | +30  |
 *   | 年末营收    | 685  |
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_waterfall_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast, '需要两列数据（阶段 + 金额）来生成瀑布图');
  }

  const title = props.title || content.headings[0]?.text || '瀑布图';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  // 提取行数据：第一阶段=起始，最后阶段=结束，中间=变化
  const rawData = table.rows.map(row => ({
    name: row[0],
    value: parseFloat(row[1]) || 0,
  }));

  if (rawData.length < 3) {
    return renderFallback(ast, '瀑布图至少需要 3 行（起始 + 至少一个变化 + 结束）');
  }

  // 重构为 ECharts 瀑布图需要的格式
  // base = invisible bar (透明底座), increase = 正向浮动条, decrease = 负向浮动条
  const categories = [];
  const baseSeries = [];    // 透明底座
  const increaseSeries = []; // 绿色增条
  const decreaseSeries = []; // 红色减条
  const linePoints = [];     // 虚线连接点（每个柱子的顶部 y 值）

  let runningTotal = 0; // 累计值的虚拟起点是 0，但从起始值开始

  for (let i = 0; i < rawData.length; i++) {
    const { name, value } = rawData[i];
    categories.push(name);

    if (i === 0) {
      // 第一个柱子：起始值，从 0 开始的全高柱子
      const v = Math.abs(value);
      baseSeries.push(0);
      increaseSeries.push({ value: v, itemStyle: { color: '#2563EB', borderRadius: [4, 4, 0, 0] } });
      decreaseSeries.push(0);
      runningTotal = value; // 可能是正或负
      linePoints.push(runningTotal);
    } else if (i === rawData.length - 1) {
      // 最后一个柱子：最终结果，从 0 开始的全高柱子
      const finalValue = value; // 实际最终值
      baseSeries.push(0);
      increaseSeries.push({ value: finalValue, itemStyle: { color: '#2563EB', borderRadius: [4, 4, 0, 0] } });
      decreaseSeries.push(0);
      linePoints.push(finalValue);
    } else {
      // 中间柱子：浮动显示变化量
      const delta = value;
      if (delta >= 0) {
        // 正增长：底座 = runningTotal, 增高条 = delta
        baseSeries.push(runningTotal);
        increaseSeries.push({ value: delta, itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0] } });
        decreaseSeries.push(0);
      } else {
        // 负增长：底座 = runningTotal + delta (新累计值), 降条 = |delta|
        baseSeries.push(runningTotal + delta);
        increaseSeries.push(0);
        decreaseSeries.push({ value: Math.abs(delta), itemStyle: { color: '#DC2626', borderRadius: [4, 4, 0, 0] } });
      }
      runningTotal += delta;
      linePoints.push(runningTotal);
    }
  }

  // 计算 Y 轴最大值（排除首尾，中间增量的累计最大点 + 少量余量）
  let cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (let i = 1; i < rawData.length - 1; i++) {
    cumVal += rawData[i].value;
    if (cumVal > cumMax) cumMax = cumVal;
  }
  // 最终值也要考虑
  const endVal = rawData[rawData.length - 1].value;
  if (endVal > cumMax) cumMax = endVal;
  const yMax = Math.ceil(cumMax * 1.08);

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const idx = params[0].dataIndex;
        const raw = rawData[idx];
        if (idx === 0) return raw.name + '<br/>起始值: ' + raw.value;
        if (idx === rawData.length - 1) return raw.name + '<br/>最终值: ' + raw.value;
        const sign = raw.value >= 0 ? '+' : '';
        return raw.name + '<br/>变化: ' + sign + raw.value + '<br/>累计: ' + linePoints[idx];
      }
    },
    legend: {
      bottom: 8, textStyle: { fontSize: 11 },
      data: ['增长', '减少'],
      selectedMode: false,
    },
    grid: { left: '8%', right: '8%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 11, color: '#666', rotate: categories.length > 6 ? 25 : 0 },
      axisLine: { lineStyle: { color: '#ddd' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: yMax,
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        name: '底座', type: 'bar', stack: 'waterfall',
        data: baseSeries,
        itemStyle: { color: 'transparent', borderColor: 'transparent' },
        label: { show: false },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        name: '增长', type: 'bar', stack: 'waterfall',
        data: increaseSeries,
        label: {
          show: true, position: 'top', fontSize: 10, color: '#10b981',
          formatter: function(p) { return p.value > 0 && p.dataIndex > 0 && p.dataIndex < rawData.length - 1 ? '+' + p.value : (p.dataIndex === 0 || p.dataIndex === rawData.length - 1 ? p.value : ''); }
        },
      },
      {
        name: '减少', type: 'bar', stack: 'waterfall',
        data: decreaseSeries,
        label: {
          show: true, position: 'bottom', fontSize: 10, color: '#ef4444',
          formatter: function(p) { return p.value > 0 ? '-' + p.value : ''; }
        },
      },
    ],
  };

  const hLines = { categories: categories, linePoints: linePoints };

  const startVal = rawData[0].value;
  const totalChange = endVal - startVal;
  const changeSign = totalChange >= 0 ? '↑' : '↓';

  return buildChartSlide(chartId, title, echartOption, hLines, startVal, endVal, totalChange, changeSign);
}

function renderFallback(ast, msg) {
  const title = ast.props.title || ast.content.headings[0]?.text || '';
  return `<div class="slide slide-content" style="background: var(--color-bg); padding: 50px 70px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <p style="color:#999;">（${msg || '数据不足'}）</p>
</div>`;
}

function buildChartSlide(chartId, title, option, hLines, startVal, endVal, totalChange, changeSign) {
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');
  const hLinesJSON = JSON.stringify(hLines);
  const color = totalChange >= 0 ? '#10b981' : '#ef4444';

  return `
<div class="slide slide-chart" style="background: #fff; padding: 30px 40px; display: flex; flex-direction: column;">
  <div class="chart-info-tag" style="position: absolute; top: 12px; right: 20px; background: #2ecc71; color: #fff; font-size: 11px; padding: 4px 12px; border-radius: 10px; z-index: 5; font-weight: 600;">
    ✅ SVG 矢量 → PPT 可编辑
  </div>
  <div class="chart-container" id="${chartId}" style="flex: 1; width: 100%; min-height: 0;"></div>
  <div class="waterfall-summary" style="position: absolute; bottom: 18px; left: 44px; font-size: 11px; color: ${color}; background: rgba(255,255,255,0.9); padding: 4px 10px; border-radius: 4px; font-weight: 600;">
    ${startVal} → ${endVal}，净变化 ${changeSign}${Math.abs(totalChange)}
  </div>
</div>
<script>
(function() {
  var dom = document.getElementById('${chartId}');
  if (!dom) return;
  var chart = echarts.init(dom, null, { renderer: 'svg' });
  var opt = JSON.parse('${optJSON}');
  opt.series[1].label.formatter = function(p) { return p.value > 0 && p.dataIndex > 0 && p.dataIndex < 9 ? '+' + p.value : (p.dataIndex === 0 || p.dataIndex === 9 ? p.value : ''); };
  opt.series[2].label.formatter = function(p) { return p.value > 0 ? '-' + p.value : ''; };
  var hl = ${hLinesJSON};
  opt.series.push({ name: '累计线', type: 'custom', data: [0], z: 2,
    renderItem: function(params, api) {
      var children = [];
      for (var j = 0; j < hl.linePoints.length - 1; j++) {
        var p1 = api.coord([hl.categories[j], hl.linePoints[j]]);
        var p2 = api.coord([hl.categories[j+1], hl.linePoints[j]]);
        children.push({ type: 'line',
          shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p1[1] },
          style: { stroke: '#999', lineWidth: 1.5, lineDash: [4, 3] } });
      }
      return { type: 'group', children: children };
    },
  });
  chart.setOption(opt);
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
