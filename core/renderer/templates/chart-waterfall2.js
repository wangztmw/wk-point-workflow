/**
 * chart-waterfall2.js — 双侧/分段瀑布图
 *
 * 支持在中间插入"合计"柱（全高落地柱），将瀑布分为左右两段。
 * 正值=绿色增量（往上），负值=红色减量（往下），虚线串联累计值。
 *
 * 规则：行名包含"合计"或"小计"→ 落地柱（从0开始），其余按普通瀑布规则。
 *
 * Markdown 示例：
 *   <!-- slide: chart, type=waterfall2, title=全年利润分析 -->
 *   | 阶段       | 金额 |
 *   |------------|------|
 *   | 年初利润    | 300  |
 *   | 新产品收入  | +150 |
 *   | 原材料涨价  | -80  |
 *   | 上半年合计  | 370  |
 *   | 市场扩张    | +120 |
 *   | 汇率损失    | -45  |
 *   | 年末利润    | 445  |
 */

function render(ast, config) {
  const { content, props, index } = ast;
  const table = content.table;
  const chartId = 'chart_wf2_' + index;

  if (!table || !table.headers || table.headers.length < 2) {
    return renderFallback(ast, '需要两列数据（阶段 + 金额）');
  }

  const title = props.title || content.headings[0]?.text || '瀑布图';
  const colors = config.chartColors || ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'];

  const rawData = table.rows.map(row => ({
    name: row[0],
    value: parseFloat(row[1]) || 0,
  }));

  if (rawData.length < 3) {
    return renderFallback(ast, '至少需要 3 行');
  }

  // 判断每行：合计行（落地柱）vs 变化行（浮动柱）
  const isSubtotal = (name) => /合计|小计|汇总|总计/.test(name);

  // 构建 ECharts 瀑布图
  // base=透明底座, up=绿色增条, down=红色减条, full=落地柱(不参与stack)
  const categories = [];
  const baseSeries = [];
  const upSeries = [];      // 绿色浮动增条
  const downSeries = [];    // 红色浮动减条
  const fullSeries = [];    // 落地柱（起始/合计/结束），用独立的 bar 不加 stack
  const linePoints = [];

  let running = rawData[0].value;

  for (let i = 0; i < rawData.length; i++) {
    const { name, value } = rawData[i];
    categories.push(name);

    // 落地柱：第一行、最后一行、合计行
    if (i === 0 || i === rawData.length - 1 || isSubtotal(name)) {
      baseSeries.push('-');
      upSeries.push('-');
      downSeries.push('-');
      fullSeries.push({
        value: Math.abs(value),
        itemStyle: {
          color: '#2563EB',
          borderRadius: [4, 4, 0, 0],
        },
      });
      if (i === 0) running = value;
      else if (isSubtotal(name)) running = value; // 合计后重置累计起点
      linePoints.push(value);
    } else {
      // 浮动柱
      const delta = value;
      fullSeries.push('-');
      if (delta >= 0) {
        baseSeries.push(running);
        upSeries.push({
          value: delta,
          itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0] },
        });
        downSeries.push('-');
      } else {
        baseSeries.push(running + delta);
        upSeries.push('-');
        downSeries.push({
          value: Math.abs(delta),
          itemStyle: { color: '#DC2626', borderRadius: [4, 4, 0, 0] },
        });
      }
      running += delta;
      linePoints.push(running);
    }
  }

  // Y 轴最大值
  let cumMax = rawData[0].value, cumVal2 = rawData[0].value;
  // 分段计算：遇到合计行重置
  for (let i = 1; i < rawData.length; i++) {
    if (isSubtotal(rawData[i].name)) { cumVal2 = rawData[i].value; if (cumVal2 > cumMax) cumMax = cumVal2; continue; }
    if (i === rawData.length - 1) { if (rawData[i].value > cumMax) cumMax = rawData[i].value; break; }
    cumVal2 += rawData[i].value;
    if (cumVal2 > cumMax) cumMax = cumVal2;
  }
  const yMax = Math.ceil(cumMax * 1.08);

  const echartOption = {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 18, color: '#333' } },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function(params) {
        var idx = params[0].dataIndex;
        var r = rawData[idx];
        if (idx === 0) return r.name + '<br/>起始: ' + r.value;
        if (idx === rawData.length - 1) return r.name + '<br/>最终: ' + r.value;
        if (isSubtotal(r.name)) return r.name + '<br/>合计: ' + r.value;
        var sign = r.value >= 0 ? '+' : '';
        return r.name + '<br/>变化: ' + sign + r.value;
      }
    },
    legend: { bottom: 8, textStyle: { fontSize: 11 }, data: ['增长', '减少'], selectedMode: false },
    grid: { left: '10%', right: '8%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category', data: categories,
      axisLabel: { fontSize: 10, color: '#666', rotate: categories.length > 6 ? 25 : 0 },
      axisLine: { lineStyle: { color: '#ddd' } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', max: yMax,
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      { name: '底座', type: 'bar', stack: 'wf2',
        data: baseSeries.map(v => v === '-' ? null : v),
        itemStyle: { color: 'transparent' }, label: { show: false },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      { name: '增长', type: 'bar', stack: 'wf2',
        data: upSeries.map(v => v === '-' ? null : v),
        label: { show: true, position: 'top', fontSize: 9, color: '#10b981',
          formatter: function(p) { return p.value != null ? '+' + p.value : ''; }
        },
      },
      { name: '减少', type: 'bar', stack: 'wf2',
        data: downSeries.map(v => v === '-' ? null : v),
        label: { show: true, position: 'bottom', fontSize: 9, color: '#ef4444',
          formatter: function(p) { return p.value != null ? '-' + p.value : ''; }
        },
      },
      { name: '落地柱', type: 'bar',
        data: fullSeries.map(v => v === '-' ? null : v),
        label: { show: true, position: 'top', fontSize: 10, color: '#333', fontWeight: 'bold' },
      },
    ],
  };

  // 水平连接线数据（renderItem 不能进 JSON，单独传）
  const hLines = { categories: categories, linePoints: linePoints };

  const startVal = rawData[0].value;
  const endVal = rawData[rawData.length - 1].value;
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
  // 1. 解析 JSON-safe 部分
  var opt = JSON.parse('${optJSON}');
  // 2. 补回 JSON 丢失的 formatter 函数
  opt.series[1].label.formatter = function(p) { return p.value != null ? '+' + p.value : ''; };
  opt.series[2].label.formatter = function(p) { return p.value != null ? '-' + p.value : ''; };
  // 3. 追加水平连接线系列（renderItem 不能进 JSON）
  var hl = ${hLinesJSON};
  opt.series.push({
    name: '累计线', type: 'custom', data: [0], z: 2,
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
  // 4. 一次 setOption 搞定全部
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
