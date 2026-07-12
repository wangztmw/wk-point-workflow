/**
 * native-export.js
 * 从 Chart.js 实例提取数据 → PptxGenJS 构建原生可编辑图表
 *
 * 核心优势：slide.addChart() 生成 OOXML <c:chart> 元素，
 * 导出的 PPTX 中每根柱子/每个扇区/每个标签都是独立可编辑的原生对象。
 * 双击图表可打开内嵌数据表编辑数值。
 */

// ============================================================
// 1. 图表数据源定义（与 HTML 中 Chart.js 预览共享同一份数据）
// ============================================================

const CHART_DATA = {
  // Slide 2: 柱状图
  bar: {
    title: '季度销售对比（柱状图）',
    type: 'bar',
    catAxisTitle: '季度',
    valAxisTitle: '销售额（万元）',
    series: [
      { name: '产品 A', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [120, 145, 168, 192], color: '4472C4' },
      { name: '产品 B', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [85,  102, 125, 148], color: 'ED7D31' },
      { name: '产品 C', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [60,  78,  92,  110], color: '70AD47' },
    ]
  },

  // Slide 3: 饼图
  pie: {
    title: '市场份额分布（饼图）',
    type: 'pie',
    series: [
      { name: '份额', labels: ['竞品 A', '竞品 B', '竞品 C', '其他'], values: [35, 28, 22, 15], color: ['4472C4', 'ED7D31', '70AD47', 'FFC000'] },
    ]
  },

  // Slide 3: 环形图
  doughnut: {
    title: '用户来源渠道（环形图）',
    type: 'doughnut',
    series: [
      { name: '占比', labels: ['搜索', '社交', '直接', '邮件', '其他'], values: [40, 25, 18, 12, 5], color: ['4472C4', 'ED7D31', '70AD47', 'FFC000', 'A5A5A5'] },
    ]
  },

  // Slide 4: 折线图
  line: {
    title: '全年 DAU/MAU 趋势（折线图）',
    type: 'line',
    catAxisTitle: '月份',
    valAxisTitle: '用户数（万）',
    series: [
      { name: 'DAU', labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'], values: [120,132,145,162,178,195,210,228,240,255,268,280], color: '4472C4' },
      { name: 'MAU', labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'], values: [800,820,850,880,910,950,980,1020,1050,1080,1120,1150], color: 'ED7D31' },
    ]
  },
};

// ============================================================
// 2. 从 Chart.js 实例提取数据（兼容性方案）
// ============================================================
function extractChartData(chartInstance) {
  if (!chartInstance || !chartInstance.config) return null;
  const cfg = chartInstance.config;
  const type = cfg.type; // 'bar' | 'pie' | 'doughnut' | 'line'
  const labels = cfg.data.labels;
  const series = cfg.data.datasets.map((ds, i) => ({
    name: ds.label || `Series ${i+1}`,
    labels: labels,
    values: ds.data,
    color: Array.isArray(ds.backgroundColor) ? ds.backgroundColor.map(c => c.replace('#','')) : (ds.backgroundColor || '4472C4').replace('#',''),
  }));
  return { type, series, title: cfg.options?.plugins?.title?.text || '' };
}

// ============================================================
// 3. PptxGenJS 图表类型映射
// ============================================================
const CHART_TYPE_MAP = {
  'bar':      'BAR',
  'line':     'LINE',
  'pie':      'PIE',
  'doughnut': 'DOUGHNUT',
  'scatter':  'SCATTER',
  'radar':    'RADAR',
  'area':     'AREA',
};

// ============================================================
// 4. PPT 布局常量（16:9，单位：英寸）
// ============================================================
const LAYOUT = { width: 10, height: 5.625 };
const MARGIN = { left: 0.6, right: 0.4, top: 0.5, bottom: 0.4 };

function chartRect(fullWidth = true) {
  return {
    x: MARGIN.left,
    y: MARGIN.top + 0.55,
    w: LAYOUT.width - MARGIN.left - MARGIN.right - (fullWidth ? 0 : 0),
    h: LAYOUT.height - MARGIN.top - MARGIN.bottom - 0.6,
  };
}

// ============================================================
// 5. 构建完整 PPTX（所有 6 页幻灯片）
// ============================================================
function buildNativePPTX(extraChartData = null) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CUSTOM_16x9', width: LAYOUT.width, height: LAYOUT.height });
  pptx.layout = 'CUSTOM_16x9';

  // --- Slide 1: 标题页 ---
  addTitleSlide(pptx);

  // --- Slide 2: 原生柱状图 ---
  addChartSlide(pptx, CHART_DATA.bar, 'BAR');

  // --- Slide 3: 饼图（左）+ 环形图（右）---
  addDualChartSlide(pptx, CHART_DATA.pie, CHART_DATA.doughnut);

  // --- Slide 4: 折线图 ---
  addChartSlide(pptx, CHART_DATA.line, 'LINE');

  // --- Slide 5: 混合页（文本 + 形状 + 小型图表）---
  addMixedSlide(pptx);

  // --- Slide 6: 对照说明页 ---
  addSummarySlide(pptx);

  // 如果有视觉 AI 提取的额外图表数据，附加到末尾
  if (extraChartData) {
    addChartSlide(pptx, extraChartData, CHART_TYPE_MAP[extraChartData.type] || 'BAR');
  }

  return pptx;
}

// ============================================================
// 6. 各幻灯片构建函数
// ============================================================

function addTitleSlide(pptx) {
  const slide = pptx.addSlide();
  // 渐变背景用纯色代替（PptxGenJS v3 对渐变支持有限）
  slide.background = { fill: '1a1a2e' };

  slide.addText('HTML → 原生可编辑 PPT 图表', {
    x: 0.5, y: 1.6, w: 9.0, h: 1.0,
    fontSize: 36, bold: true, color: 'FFFFFF',
    align: 'center', fontFace: 'Microsoft YaHei',
  });
  slide.addText('PptxGenJS slide.addChart() 原生图表引擎', {
    x: 0.5, y: 2.6, w: 9.0, h: 0.6,
    fontSize: 18, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei',
  });
  slide.addText('✅ 柱状图逐根编辑  ✅ 饼图逐扇区编辑  ✅ 内嵌数据表  ✅ 标签/图例/标题均可编辑', {
    x: 0.5, y: 3.6, w: 9.0, h: 0.5,
    fontSize: 12, color: '2ecc71', align: 'center', fontFace: 'Microsoft YaHei',
  });
}

function addChartSlide(pptx, data, chartType) {
  const slide = pptx.addSlide();
  const rect = chartRect();

  // 标题
  slide.addText(data.title, {
    x: MARGIN.left, y: MARGIN.top, w: 9, h: 0.5,
    fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
  });

  // 原生图表 — 每个数据点独立可编辑
  const chartData = data.series.map(s => ({
    name: s.name,
    labels: s.labels,
    values: s.values,
  }));

  // 提取颜色数组
  const chartColors = data.series.length === 1 && Array.isArray(data.series[0].color)
    ? data.series[0].color  // 饼图/环形图：每个扇区不同颜色
    : data.series.map(s => Array.isArray(s.color) ? s.color[0] : s.color);

  slide.addChart(pptx.charts[chartType], chartData, {
    ...rect,
    showTitle: false,  // 标题已单独添加（更可控）
    showLegend: data.series.length > 1 || chartType === 'PIE' || chartType === 'DOUGHNUT',
    legendPos: 'b',
    legendFontSize: 10,
    showValue: true,            // 显示数据标签
    dataLabelPosition: chartType === 'PIE' || chartType === 'DOUGHNUT' ? 'outEnd' : 'outEnd',
    dataLabelColor: '333333',
    dataLabelFontSize: 9,
    chartColors: chartColors,
    catAxisTitle: data.catAxisTitle || '',
    valAxisTitle: data.valAxisTitle || '',
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
    valAxisTitleFontSize: 9,
    catAxisTitleFontSize: 9,
    lineSize: chartType === 'LINE' ? 2 : undefined,
    lineSmooth: chartType === 'LINE' ? true : undefined,
    // 柱状图分组间距
    barGrouping: chartType === 'BAR' ? 'clustered' : undefined,
    barGapWidthPct: chartType === 'BAR' ? 80 : undefined,
  });
}

function addDualChartSlide(pptx, leftData, rightData) {
  const slide = pptx.addSlide();

  // 左侧饼图
  slide.addText(leftData.title, {
    x: 0.3, y: 0.2, w: 4.7, h: 0.4,
    fontSize: 14, bold: true, color: '333333', align: 'center', fontFace: 'Microsoft YaHei',
  });
  slide.addChart(pptx.charts.PIE, leftData.series.map(s => ({
    name: s.name, labels: s.labels, values: s.values,
  })), {
    x: 0.3, y: 0.65, w: 4.7, h: 4.3,
    showLegend: true, legendPos: 'b', legendFontSize: 8,
    showValue: true, dataLabelPosition: 'outEnd',
    dataLabelColor: '333333', dataLabelFontSize: 9,
    chartColors: leftData.series[0].color,
  });

  // 右侧环形图
  slide.addText(rightData.title, {
    x: 5.2, y: 0.2, w: 4.7, h: 0.4,
    fontSize: 14, bold: true, color: '333333', align: 'center', fontFace: 'Microsoft YaHei',
  });
  slide.addChart(pptx.charts.DOUGHNUT, rightData.series.map(s => ({
    name: s.name, labels: s.labels, values: s.values,
  })), {
    x: 5.2, y: 0.65, w: 4.7, h: 4.3,
    showLegend: true, legendPos: 'b', legendFontSize: 8,
    showValue: true, dataLabelPosition: 'outEnd',
    dataLabelColor: '333333', dataLabelFontSize: 9,
    chartColors: rightData.series[0].color,
  });
}

function addMixedSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { fill: 'F5F7FF' };

  // 标题
  slide.addText('混合内容页：文本 + 形状 + 迷你图表', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
  });

  // 左侧文字区
  slide.addText([
    { text: '关键指标概览\n', options: { fontSize: 14, bold: true, color: '333333' } },
    { text: '• 总营收：¥580 万（同比 +18%）\n', options: { fontSize: 12, color: '444444' } },
    { text: '• 活跃用户：12.8 万（环比 +5%）\n', options: { fontSize: 12, color: '444444' } },
    { text: '• 客单价：¥456（同比 +8%）\n', options: { fontSize: 12, color: '444444' } },
    { text: '• NPS 评分：72 分（+3 分）', options: { fontSize: 12, color: '444444' } },
  ], {
    x: 0.5, y: 1.1, w: 4.2, h: 3.5,
    valign: 'top', fontFace: 'Microsoft YaHei',
  });

  // 右侧迷你柱状图
  slide.addChart(pptx.charts.BAR, [{
    name: '营收',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    values: [120, 145, 168, 192],
  }], {
    x: 5.0, y: 1.1, w: 4.7, h: 3.5,
    showLegend: false,
    showTitle: true, title: '季度营收趋势', titleFontSize: 11, titleColor: '333333',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8,
    chartColors: ['4472C4'],
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
  });

  // 底部装饰矩形（原生形状 → PPT 中可拖拽/改色）
  slide.addShape('rect', {
    x: 0.5, y: 4.9, w: 9.0, h: 0.06,
    fill: { type: 'solid', color: '667eea' },
  });
}

function addSummarySlide(pptx) {
  const slide = pptx.addSlide();

  slide.addText('导出效果对照：原生图表 vs 传统截图', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
  });

  const items = [
    ['✅', '每根柱子/扇区', '独立可选中、改颜色、改数值'],
    ['✅', '数据标签', '可编辑文字、字号、位置'],
    ['✅', '图例', '可编辑/删除/移动位置'],
    ['✅', '坐标轴标题', '可编辑文本框'],
    ['✅', '内嵌数据表', '双击图表 → 弹出 Excel 式编辑器'],
    ['✅', '图表标题', '可编辑/格式化'],
    ['⚠️', '传统截图方式', '一整张死图片，什么都改不了'],
  ];

  items.forEach((row, i) => {
    const isWarning = row[0] === '⚠️';
    slide.addText(`${row[0]}  ${row[1]}：${row[2]}`, {
      x: 0.8, y: 1.1 + i * 0.58, w: 8.5, h: 0.45,
      fontSize: 13, color: isWarning ? 'e94560' : '333333',
      fontFace: 'Microsoft YaHei',
    });
  });
}

// ============================================================
// 7. 主导出函数
// ============================================================

/**
 * 导出原生可编辑 PPTX（从预定义数据）
 */
async function exportNativePPTX() {
  try {
    setStatus('⏳ 正在构建原生图表 PPTX...');
    showLoading(true);

    const pptx = buildNativePPTX();
    await pptx.writeFile({ fileName: 'native-editable-charts.pptx' });

    setStatus('✅ 导出成功！每根柱子/每个扇区在 PPT 中独立可编辑，双击图表可编辑数据');
  } catch (err) {
    console.error('导出失败:', err);
    setStatus('❌ 导出失败: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

/**
 * 从 Chart.js 实例导出（提取实时数据）
 */
async function exportFromChartInstances(chartInstances) {
  try {
    setStatus('⏳ 从 Chart.js 实例提取数据...');
    showLoading(true);

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM_16x9', width: LAYOUT.width, height: LAYOUT.height });
    pptx.layout = 'CUSTOM_16x9';

    for (let i = 0; i < chartInstances.length; i++) {
      const chart = chartInstances[i];
      if (!chart || !chart.config) continue;

      const extracted = extractChartData(chart);
      if (!extracted) continue;

      const slide = pptx.addSlide();
      const chartTypeName = CHART_TYPE_MAP[extracted.type] || 'BAR';

      slide.addText(extracted.title || `图表 ${i + 1}`, {
        x: 0.5, y: 0.3, w: 9, h: 0.5,
        fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
      });

      const chartData = extracted.series.map(s => ({
        name: s.name, labels: s.labels, values: s.values,
      }));

      const colors = extracted.series.flatMap(s =>
        Array.isArray(s.color) ? s.color : [s.color]
      );

      slide.addChart(pptx.charts[chartTypeName], chartData, {
        ...chartRect(),
        showTitle: false,
        showLegend: extracted.series.length > 1,
        legendPos: 'b',
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 9,
        chartColors: colors,
        catAxisLabelFontSize: 9,
        valAxisLabelFontSize: 9,
      });
    }

    await pptx.writeFile({ fileName: 'from-chartjs-instances.pptx' });
    setStatus('✅ 已从 Chart.js 实例导出原生图表 PPTX');
  } catch (err) {
    console.error(err);
    setStatus('❌ ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

// ============================================================
// 8. UI 辅助（与 HTML 中的 toolbar 配合）
// ============================================================
function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  if (el) {
    el.textContent = msg;
    el.style.color = isError ? '#e94560' : '#8899aa';
  }
}
function showLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('active', show);
}

// ============================================================
// 9. ★ 形状拆解模式 — 每根柱子 = 独立 Rectangle 形状 ★
//    导出的 PPT 中：可以自由拖拽改位置、拉宽高、旋转、改颜色
//    对比原生图表：原生图表柱子不能自由拖拽大小位置
// ============================================================

/**
 * 柱状图 → 独立矩形形状 + 文本框
 * 每根柱子是独立的 addShape(RECTANGLE)，可自由拖拽/缩放/改色
 */
function addBarChartAsShapes(slide, data, chartArea) {
  const { x: caX, y: caY, w: caW, h: caH } = chartArea;
  const series = data.series;
  const allLabels = series[0].labels;
  const numGroups = allLabels.length;
  const numSeries = series.length;

  // 计算所有值的最大值
  let maxValue = 0;
  series.forEach(s => s.values.forEach(v => { if (v > maxValue) maxValue = v; }));
  maxValue = Math.ceil(maxValue * 1.15); // 留 15% 顶部空间

  // 绘图区域（给轴标签留空间）
  const plotLeft = caX + 0.6;
  const plotRight = caX + caW - 0.1;
  const plotTop = caY + 0.15;
  const plotBottom = caY + caH - 0.45;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  // 柱子尺寸计算
  const groupW = plotW / numGroups;
  const barGap = groupW * 0.2;
  const totalBarW = groupW - barGap;
  const barW = totalBarW / numSeries;

  // 绘制每根柱子
  series.forEach((s, si) => {
    s.values.forEach((val, gi) => {
      const barH = (val / maxValue) * plotH;
      const barX = plotLeft + gi * groupW + barGap / 2 + si * barW;
      const barY = plotBottom - barH;

      // ★ 核心：每根柱子是独立矩形 → PPT 中可自由拖拽、拉宽高、旋转
      const barColor = Array.isArray(s.color) ? (s.color[gi] || s.color[0]) : s.color;
      slide.addShape('rect', {
        x: barX, y: barY, w: barW, h: Math.max(barH, 0.04),
        fill: { color: barColor },
        rectRadius: barW > 0.3 ? 0.04 : 0.02,
        line: { color: 'FFFFFF', width: 0.3 },
      });

      // 数据标签（独立文本框 → PPT 中可编辑文字/位置/字号）
      slide.addText(String(val), {
        x: barX - 0.05, y: barY - 0.24, w: barW + 0.1, h: 0.22,
        fontSize: Math.min(barW * 28, 8), align: 'center',
        color: '333333', fontFace: 'Arial',
      });
    });
  });

  // X 轴标签
  allLabels.forEach((label, gi) => {
    slide.addText(label, {
      x: plotLeft + gi * groupW, y: plotBottom + 0.06, w: groupW, h: 0.22,
      fontSize: 9, align: 'center', color: '666666', fontFace: 'Microsoft YaHei',
    });
  });

  // Y 轴刻度线 + 标签
  const numYTicks = 5;
  for (let i = 0; i <= numYTicks; i++) {
    const val = Math.round((maxValue / numYTicks) * i);
    const tickY = plotBottom - (val / maxValue) * plotH;
    // 网格线
    if (i > 0) {
      slide.addShape('line', {
        x: plotLeft, y: tickY, w: plotW, h: 0,
        line: { color: 'E0E0E0', width: 0.3, dashType: 'dash' },
      });
    }
    // 刻度标签
    slide.addText(String(val), {
      x: caX, y: tickY - 0.12, w: 0.55, h: 0.22,
      fontSize: 8, align: 'right', color: '888888', fontFace: 'Arial',
    });
  }

  // Y 轴标题
  if (data.valAxisTitle) {
    slide.addText(data.valAxisTitle, {
      x: caX, y: caY + 0.05, w: 0.55, h: 0.2,
      fontSize: 8, align: 'center', color: '666666', fontFace: 'Microsoft YaHei',
    });
  }
}

/**
 * 饼图 → 独立扇形 + 标签文本
 * 用多个三角形/扇形近似（简化方案：每个扇区做成标注框 + 色块）
 */
function addPieChartAsShapes(slide, data, chartArea) {
  const { x: caX, y: caY, w: caW, h: caH } = chartArea;
  const s = data.series[0];
  const total = s.values.reduce((a, b) => a + b, 0);
  const colors = Array.isArray(s.color) ? s.color : [s.color];

  // 左侧：色块列表 + 标签
  const legendX = caX + 0.2;
  let legendY = caY + 1.0;

  s.values.forEach((val, i) => {
    const pct = ((val / total) * 100).toFixed(1);

    // 色块（小矩形 → 可拖拽/改色）
    slide.addShape('rect', {
      x: legendX, y: legendY, w: 0.35, h: 0.25,
      fill: { color: colors[i] }, rectRadius: 0.04,
    });

    // 标签 + 数值
    slide.addText(`${s.labels[i]}: ${val} (${pct}%)`, {
      x: legendX + 0.45, y: legendY - 0.02, w: 3.0, h: 0.28,
      fontSize: 13, color: '333333', fontFace: 'Microsoft YaHei',
    });

    legendY += 0.45;
  });

  // 右侧：大色块展示（按比例缩放的大小矩形模拟饼图扇区）
  const barAreaX = caX + 4.5;
  const barAreaW = caW - 5.0;
  let accumulatedY = caY + 0.5;

  s.values.forEach((val, i) => {
    const barH = Math.max((val / total) * (caH - 0.8), 0.3);
    slide.addShape('rect', {
      x: barAreaX, y: accumulatedY, w: barAreaW, h: barH,
      fill: { color: colors[i] },
      rectRadius: 0.06,
      line: { color: 'FFFFFF', width: 0.5 },
    });
    // 扇区标签
    slide.addText(`${s.labels[i]}\n${val} (${((val/total)*100).toFixed(1)}%)`, {
      x: barAreaX + 0.15, y: accumulatedY + barH / 2 - 0.23, w: barAreaW - 0.3, h: 0.46,
      fontSize: 10, color: 'FFFFFF', fontFace: 'Microsoft YaHei', align: 'center', bold: true,
    });
    accumulatedY += barH;
  });
}

/**
 * 折线图 → 独立圆点 + 连线 + 标签
 */
function addLineChartAsShapes(slide, data, chartArea) {
  const { x: caX, y: caY, w: caW, h: caH } = chartArea;
  const series = data.series;
  const allLabels = series[0].labels;
  const numPoints = allLabels.length;

  // 计算最大值
  let maxValue = 0;
  series.forEach(s => s.values.forEach(v => { if (v > maxValue) maxValue = v; }));
  maxValue = Math.ceil(maxValue * 1.15);

  const plotLeft = caX + 0.6;
  const plotRight = caX + caW - 0.1;
  const plotTop = caY + 0.15;
  const plotBottom = caY + caH - 0.45;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;
  const stepX = plotW / (numPoints - 1);

  // 为每个系列绘制折线和数据点
  series.forEach((s, si) => {
    const color = Array.isArray(s.color) ? s.color[0] : s.color;
    const points = s.values.map((val, pi) => ({
      x: plotLeft + pi * stepX,
      y: plotBottom - (val / maxValue) * plotH,
      val: val,
    }));

    // 连线（相邻点之间画 LINE 形状）
    for (let pi = 0; pi < points.length - 1; pi++) {
      const dx = points[pi + 1].x - points[pi].x;
      const dy = points[pi + 1].y - points[pi].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) continue;
      slide.addShape('line', {
        x: points[pi].x, y: points[pi].y, w: len, h: 0,
        line: { color: color, width: 1.5 },
        rotate: Math.atan2(dy, dx) * (180 / Math.PI),
      });
    }

    // 数据点（小圆点 → 用圆角矩形近似）
    points.forEach(p => {
      slide.addShape('oval', {
        x: p.x - 0.08, y: p.y - 0.08, w: 0.16, h: 0.16,
        fill: { color: color },
        line: { color: 'FFFFFF', width: 0.5 },
      });
      // 数据标签
      slide.addText(String(p.val), {
        x: p.x - 0.2, y: p.y - 0.3, w: 0.4, h: 0.18,
        fontSize: 7, align: 'center', color: '333333', fontFace: 'Arial',
      });
    });
  });

  // X 轴标签
  allLabels.forEach((label, pi) => {
    slide.addText(label, {
      x: plotLeft + pi * stepX - stepX / 2, y: plotBottom + 0.06, w: stepX, h: 0.22,
      fontSize: 7, align: 'center', color: '666666', fontFace: 'Microsoft YaHei', rotate: 45,
    });
  });

  // Y 轴刻度
  const numYTicks = 5;
  for (let i = 0; i <= numYTicks; i++) {
    const val = Math.round((maxValue / numYTicks) * i);
    const tickY = plotBottom - (val / maxValue) * plotH;
    if (i > 0) {
      slide.addShape('line', {
        x: plotLeft, y: tickY, w: plotW, h: 0,
        line: { color: 'E0E0E0', width: 0.3, dashType: 'dash' },
      });
    }
    slide.addText(String(val), {
      x: caX, y: tickY - 0.12, w: 0.55, h: 0.22,
      fontSize: 8, align: 'right', color: '888888', fontFace: 'Arial',
    });
  }
}

/**
 * 图例（独立色块 + 文字）
 */
function addShapeLegend(slide, data, x, y) {
  const series = data.series;
  const isPie = data.type === 'pie' || data.type === 'doughnut';

  if (isPie) return; // 饼图已在扇区旁标注

  let legendX = x;
  series.forEach((s, i) => {
    const color = Array.isArray(s.color) ? s.color[0] : s.color;
    slide.addShape('rect', {
      x: legendX, y: y, w: 0.22, h: 0.22,
      fill: { color: color }, rectRadius: 0.03,
    });
    slide.addText(s.name, {
      x: legendX + 0.28, y: y - 0.02, w: 1.2, h: 0.24,
      fontSize: 9, color: '333333', fontFace: 'Microsoft YaHei',
    });
    legendX += 1.6;
  });
}

/**
 * ★ 主导出：形状拆解模式
 * 所有图表元素拆成独立形状 → PPT 中完全自由编辑
 */
function buildShapeDecomposedPPTX() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'S_16x9', width: LAYOUT.width, height: LAYOUT.height });
  pptx.layout = 'S_16x9';

  // Slide 1: 标题
  (() => {
    const s = pptx.addSlide();
    s.background = { fill: '1a1a2e' };
    s.addText('形状拆解模式 — 完全自由编辑', {
      x: 0.5, y: 1.5, w: 9, h: 0.8,
      fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei',
    });
    s.addText('每根柱子 = 独立矩形 | 每个标签 = 独立文本框 | 可自由拖拽/缩放/改色/旋转', {
      x: 0.5, y: 2.5, w: 9, h: 0.6,
      fontSize: 14, color: '2ecc71', align: 'center', fontFace: 'Microsoft YaHei',
    });
  })();

  // Slide 2: 柱状图拆解
  (() => {
    const s = pptx.addSlide();
    s.addText(CHART_DATA.bar.title + '（形状拆解）', {
      x: MARGIN.left, y: 0.2, w: 9, h: 0.45,
      fontSize: 18, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });
    addShapeLegend(s, CHART_DATA.bar, MARGIN.left, 0.6);
    addBarChartAsShapes(s, CHART_DATA.bar, {
      x: MARGIN.left, y: 0.9, w: 9.0, h: 4.5,
    });
  })();

  // Slide 3: 饼图拆解
  (() => {
    const s = pptx.addSlide();
    s.addText(CHART_DATA.pie.title + '（形状拆解）', {
      x: MARGIN.left, y: 0.2, w: 9, h: 0.45,
      fontSize: 18, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });
    addPieChartAsShapes(s, CHART_DATA.pie, {
      x: MARGIN.left, y: 0.5, w: 9.0, h: 4.8,
    });
  })();

  // Slide 4: 折线图拆解
  (() => {
    const s = pptx.addSlide();
    s.addText(CHART_DATA.line.title + '（形状拆解）', {
      x: MARGIN.left, y: 0.2, w: 9, h: 0.45,
      fontSize: 18, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });
    addShapeLegend(s, CHART_DATA.line, MARGIN.left, 0.6);
    addLineChartAsShapes(s, CHART_DATA.line, {
      x: MARGIN.left, y: 0.9, w: 9.0, h: 4.5,
    });
  })();

  // Slide 5: 总结
  (() => {
    const s = pptx.addSlide();
    s.addText('形状拆解 vs 原生图表', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });

    const items = [
      ['✅', '每根柱子', '独立矩形 → 可拖拽/缩放/旋转/改色'],
      ['✅', '数据标签', '独立文本框 → 可改文字/字大小/位置'],
      ['✅', '坐标轴', '独立线条 + 文本框'],
      ['✅', '图例', '独立小色块 + 文字 → 可任意移动'],
      ['⚠️', '无内嵌数据表', '形状模式下双击不能编辑数据（需手动调）'],
      ['💡', '适用场景', '需要 PPT 中完全自由排版时使用此模式'],
    ];

    items.forEach((row, i) => {
      s.addText(`${row[0]} ${row[1]}：${row[2]}`, {
        x: 0.8, y: 1.2 + i * 0.55, w: 8.5, h: 0.45,
        fontSize: 13, color: row[0] === '⚠️' ? 'e94560' : '333333',
        fontFace: 'Microsoft YaHei',
      });
    });
  })();

  return pptx;
}

/**
 * 导出形状拆解版 PPTX
 */
async function exportShapeDecomposed() {
  try {
    setStatus('⏳ 正在构建形状拆解 PPTX...');
    showLoading(true);

    const pptx = buildShapeDecomposedPPTX();
    await pptx.writeFile({ fileName: 'shape-decomposed-charts.pptx' });

    setStatus('✅ 导出成功！每根柱子是独立矩形，在 PPT 中可自由拖拽/缩放/改色');
  } catch (err) {
    console.error('导出失败:', err);
    setStatus('❌ 导出失败: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}
