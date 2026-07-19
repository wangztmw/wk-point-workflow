module.exports = `function addNativeChartSlide(pptx, info) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);

  // 标题
  if (info.title) {
    slide.addText(info.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.45,
      fontSize: 20, bold: true, color: '333333',
      fontFace: 'Microsoft YaHei',
    });
  }

  // 图表类型映射
  var typeMap = {
    bar: 'BAR', line: 'LINE', pie: 'PIE', doughnut: 'DOUGHNUT',
    radar: 'RADAR', scatter: 'SCATTER', area: 'AREA'
  };
  var ct = info.chartType || info.type || 'bar';
  var pptxType = typeMap[ct] || 'BAR';

  // 构建数据
  var chartData = info.series.map(function(s) {
    return { name: s.name, labels: info.categories, values: s.values };
  });

  var isPieType = ct === 'pie' || ct === 'doughnut';
  var numSeries = info.series.length;
  var seriesColors = isPieType
    ? CHART_COLORS.slice(0, info.series[0].values.length)
    : CHART_COLORS.slice(0, numSeries);

  slide.addChart(pptx.charts[pptxType], chartData, {
    x: 0.6, y: 0.9, w: 8.8, h: 4.2,
    showTitle: false,
    showLegend: numSeries > 1 || isPieType,
    legendPos: 'b', legendFontSize: 10,
    showValue: true,
    dataLabelPosition: isPieType ? 'outEnd' : 'outEnd',
    dataLabelColor: '333333', dataLabelFontSize: 9,
    chartColors: seriesColors,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    lineSize: ct === 'line' ? 2 : undefined,
    lineSmooth: ct === 'line' ? true : undefined,
    barGrouping: ct === 'bar' ? 'clustered' : undefined,
    barGapWidthPct: ct === 'bar' ? 80 : undefined,
  });

  // 脚注
  slide.addText('✅ 原生 OOXML 图表 — 双击可编辑数据表，每根柱子/扇区独立可编辑', {
    x: 0.6, y: 5.2, w: 8.8, h: 0.25,
    fontSize: 8, color: '2ecc71', fontFace: 'Microsoft YaHei',
  });
}`;
