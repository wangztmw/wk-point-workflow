module.exports = `
// ============================================================
// 标签语法 PPT 导出（遍历 blocks，按 tag 分发）
// ============================================================

function pxToIn(px) { return (Number(px) || 0) / 96; }

// 多元素slide中的瀑布图：柱形+轴线+连接线渲染到已有slide
function renderWaterfallBars(slide, rect, tbl) {
  var rows = tbl.rows || [];
  if (rows.length < 3) return;
  var rawData = rows.map(function(r){ return {name:r[0], value:parseFloat(r[1])||0}; });
  var n = rawData.length;
  var barW = (rect.w - 0.2) / n * 0.55;
  var stepX = (rect.w - 0.2) / n;
  var baseY = rect.y + rect.h - 0.3;  // X轴位置
  var chartBottom = baseY;
  // 计算Y范围
  var cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (var i = 1; i < n - 1; i++) { cumVal += rawData[i].value; if (cumVal > cumMax) cumMax = cumVal; }
  var endV = rawData[n-1].value; if (endV > cumMax) cumMax = endV;
  var scale = (rect.h - 0.8) / (cumMax * 1.08 || 1);
  var chartTop = baseY - cumMax * 1.08 * scale;
  // 坐标轴线（稍粗）
  slide.addShape('line', { x: rect.x + 0.1, y: baseY, w: rect.w - 0.2, h: 0, line: { color: 'CCCCCC', width: 1.2 } });  // X轴
  slide.addShape('line', { x: rect.x + 0.1, y: chartTop, w: 0, h: baseY - chartTop, line: { color: 'CCCCCC', width: 1.2 } });  // Y轴
  // Y轴刻度（4档）
  var yRange = cumMax * 1.08;
  var tickCount = 4;
  for (var t = 0; t <= tickCount; t++) {
    var val = Math.round(yRange * t / tickCount);
    var tickY = baseY - val * scale;
    // 刻度短线
    slide.addShape('line', { x: rect.x + 0.05, y: tickY, w: 0.08, h: 0, line: { color: 'CCCCCC', width: 0.6 } });
    // 刻度标签
    slide.addText(String(val), { x: rect.x - 0.05, y: tickY - 0.1, w: 0.4, h: 0.2, fontSize: 6, color: '999999', align: 'right', fontFace: 'Microsoft YaHei' });
  }
  // 柱子 + 标签
  var cumulative = rawData[0].value;
  var linePoints = [rawData[0].value];  // HTML版 linePoints
  rawData.forEach(function(d, i){
    var isFirst = i === 0;
    var isLast = i === n - 1;
    var cx = rect.x + 0.1 + i * stepX + (stepX - barW) / 2;
    var color, barH, barY;
    if (isFirst) {
      barH = Math.abs(d.value) * scale; barY = baseY - barH; color = '2563EB';
    } else if (isLast) {
      barH = d.value * scale; barY = baseY - barH; color = '2563EB';
      linePoints.push(d.value);
    } else {
      if (d.value >= 0) {
        barH = d.value * scale;
        barY = baseY - cumulative * scale - barH;
        color = '16A34A';
      } else {
        barH = Math.abs(d.value) * scale;
        barY = baseY - cumulative * scale;
        color = 'DC2626';
      }
      cumulative += d.value;
      linePoints.push(cumulative);
    }
    if (barH < 0.05) barH = 0.05;
    slide.addShape('rect', { x: cx, y: barY, w: barW, h: barH, fill: { color: color }, rectRadius: 0.02 });
    slide.addText(d.name, { x: cx - stepX*0.15, y: baseY + 0.05, w: barW + stepX*0.3, h: 0.2, fontSize: 6, color: '888888', align: 'center', fontFace: 'Microsoft YaHei' });
    slide.addText(String(d.value), { x: cx, y: barY - 0.18, w: barW, h: 0.15, fontSize: 7, color: color, align: 'center', fontFace: 'Microsoft YaHei', bold: true });
  });
  // 虚线连接：每条线在 linePoints[j] 高度，从 bar[j] 到 bar[j+1]
  for (var j = 0; j < linePoints.length - 1; j++) {
    var lx1 = rect.x + 0.1 + j * stepX + stepX / 2;
    var lx2 = rect.x + 0.1 + (j+1) * stepX + stepX / 2;
    var ly = baseY - linePoints[j] * scale;
    slide.addShape('line', { x: lx1, y: ly, w: lx2 - lx1, h: 0, line: { color: '999999', width: 1, dashType: 'dash' } });
  }
}

// 根据框宽+字号+文本长度估算实际高度（英寸）
function addTagSlidePptx(pptx, s) {
  // 瀑布图：委托专门的形状拼凑函数（它自己创建 slide）
  if (s.blocks && s.blocks.length === 1 && s.blocks[0].tag === 'chart') {
    var st = s.blocks[0].style || {};
    var ct = (st.chartType || st.type || 'bar').toLowerCase();
    if (ct === 'waterfall' || ct === 'waterfall2') {
      var tbl = s.blocks[0].data;
      if (tbl && tbl.headers && tbl.headers.length >= 2) {
        var cats = tbl.rows.map(function(r){return r[0];});
        var ser = [];
        for (var c = 1; c < tbl.headers.length; c++) {
          ser.push({name:tbl.headers[c], values:tbl.rows.map(function(r){return parseFloat(r[c])||0;})});
        }
        addWaterfallShapes(pptx, {chartType:ct, categories:cats, series:ser, title:st.title||s.title||''});
        return;
      }
    }
  }

  var slide = pptx.addSlide();
  // DARK_SLIDE_TYPES 来自 types/ppt-projection.js，嵌入 SLIDE_DATA 常量区
  var DARK_TYPES = __DARK_TYPES__;
  var isDark = DARK_TYPES.indexOf(s.type) >= 0;
  if (isDark) slide.background = { fill: '1a1a2e' };
  drawBackgroundShapes(slide);

  // 布局类 slide：渲染页面标题
  var isLayoutSlide = s.type === 'stack' || s.type === 'grid' || s.type === 'split';
  if (isLayoutSlide && s.title) {
    slide.addText(s.title, { x: 0.6, y: 0.15, w: 8.8, h: 0.4, fontSize: 20, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  }

  if (!s.blocks) return;
  // layout slide 的坐标已是英寸（投影层 layout-engine 产出），其余是像素需 pxToIn
  var isLayoutSlide = s.type === 'stack' || s.type === 'grid' || s.type === 'split';
  s.blocks.forEach(function(block) {
    var st = block.style || {};
    var tag = block.tag;
    var rect = isLayoutSlide
      ? { x: Number(st.x) || 0.6, y: Number(st.y) || 0.3, w: Number(st.w) || 8.8, h: Number(st.h) || 0.4 }
      : { x: pxToIn(st.x), y: pxToIn(st.y), w: pxToIn(st.w || 820), h: pxToIn(st.h || 40) };

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      var fs = Number(st['font-size']) || (tag==='h1'?32:tag==='h2'?24:tag==='h3'?18:15);
      var fc = fitChars(rect.w * 96, rect.h * 96, fs, 1.3);
      var txt = truncText(block.data.text || '', fc.total);
      slide.addText(txt, {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fontSize: fs, bold: st.bold === 'true' || tag === 'h1' || tag === 'h2',
        color: st.color || '333333', align: st.align || 'left',
        fontFace: 'Microsoft YaHei'
      });
    }
    else if (tag === 'p') {
      var fs = Number(st['font-size']) || 13;
      var fc = fitChars(rect.w * 96, rect.h * 96, fs, 1.6);
      var rawRuns = (block.data.runs && block.data.runs.length > 0) ? block.data.runs : [{ text: block.data.text || '', options: {} }];
      // 截断富文本
      var fullText = rawRuns.map(function(r){return r.text||'';}).join('');
      var truncated = truncText(fullText, fc.total);
      var runs = [{ text: truncated, options: { fontSize: fs, color: st.color || '555555' } }];
      slide.addText(runs, {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fontSize: fs, color: st.color || '555555', align: st.align || 'left',
        fontFace: 'Microsoft YaHei', valign: 'top'
      });
    }
    else if (tag === 'list') {
      var fs = Number(st['font-size']) || 12;
      var items = block.data.items || [];
      // 每项高度: 根据列宽和字号估算行数（中文宽≈字号）
      var itemW = rect.w - 0.2;  // 英寸
      var cpl = Math.floor(itemW * 96 / (fs * 1.0));  // 每行字符数
      if (cpl < 1) cpl = 1;
      var iy = rect.y;
      items.forEach(function(item) {
        if (iy > rect.y + rect.h - 0.1) return;
        var t = item.text || '';
        var lines = Math.ceil(t.length / cpl);
        var itemH = Math.max(0.28, lines * fs / 96 * 2.0 + 0.04);  // 至少0.28,多行加高
        var prefix = block.data.ordered ? '1. ' : '\\u25b8  ';
        var runs = [{ text: prefix, options: { color: '667eea', fontSize: fs } }];
        if (item.runs) runs = runs.concat(item.runs);
        else runs.push({ text: item.text || '', options: { fontSize: fs, color: st.color || '444444' } });
        slide.addText(runs, {
          x: rect.x + 0.1, y: iy, w: rect.w - 0.2, h: itemH,
          fontSize: fs, fontFace: 'Microsoft YaHei'
        });
        iy += itemH + 0.02;
      });
    }
    else if (tag === 'table') {
      var tbl = block.data;
      if (!tbl || !tbl.headers) return;
      var fs = Number(st['font-size']) || 11;
      var nCols = tbl.headers.length;
      var TK = { pt: 2, color: '1a1a1a', type: 'solid' };
      var HD = { pt: 1.5, color: '1a1a1a', type: 'solid' };
      var N = null;
      var rows = [tbl.headers.map(function(h) {
        return { text: h, options: { bold: true, fontSize: fs, color: '1a1a1a', align: 'center', fontFace: 'Microsoft YaHei', border: [TK, N, HD, N] }};
      })];
      tbl.rows.forEach(function(row, ri) {
        var isLast = ri === tbl.rows.length - 1;
        rows.push(row.map(function(c) {
          return { text: c, options: {
            fill: { color: ri%2===0 ? 'F9FAFB' : 'FFFFFF' },
            align: 'center', fontFace: 'Microsoft YaHei', fontSize: fs-1, color: '333333',
            border: isLast ? [N, N, TK, N] : [N, N, N, N]
          }};
        }));
      });
      slide.addTable(rows, {
        x: rect.x, y: rect.y, w: rect.w,
        border: { type: 'none' },
        colW: tbl.headers.map(function(_, ci) { return ci === 0 ? rect.w * 0.35 : (rect.w * 0.65) / (nCols - 1); }),
        rowH: 0.3
      });
    }
    else if (tag === 'img') {
      var src = block.data.src || '';
      var label = block.data.label || '';
      if (src && src.length > 100) {
        try { slide.addImage({ data: src, x: rect.x, y: rect.y, w: rect.w, h: rect.h, sizing: { type: 'contain', w: rect.w, h: rect.h } }); } catch(e) {}
      } else {
        slide.addShape('rect', { x: rect.x, y: rect.y, w: rect.w, h: rect.h, fill: { color: 'F5F5F5' }, line: { color: 'CCCCCC', width: 0.5, dashType: 'dash' }, rectRadius: 0.05 });
        if (label) slide.addText(label, { x: rect.x, y: rect.y + rect.h/2 - 0.15, w: rect.w, h: 0.3, fontSize: 11, bold: true, color: '999999', align: 'center', fontFace: 'Microsoft YaHei' });
      }
    }
    else if (tag === 'box') {
      var opts = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
      if (st['fill-color']) opts.fill = { color: st['fill-color'] };
      if (st['border-color']) opts.line = { color: st['border-color'], width: Number(st['border-width']) || 0.5 };
      if (st['border-radius']) opts.rectRadius = Number(st['border-radius']) / 96;
      slide.addShape('rect', opts);
    }
    else if (tag === 'chart') {
      var tbl2 = block.data;
      if (!tbl2 || !tbl2.headers || tbl2.headers.length < 2) return;
      var chartType = (st.chartType || st.type || 'bar').toLowerCase();
      var cats = tbl2.rows.map(function(r) { return r[0]; });
      var series = [];
      for (var col = 1; col < tbl2.headers.length; col++) {
        series.push({ name: tbl2.headers[col], values: tbl2.rows.map(function(r) { return parseFloat(r[col]) || 0; }) });
      }
      // 瀑布图：多元素slide用简化柱形，单元素slide已在入口处托管
      if (chartType === 'waterfall' || chartType === 'waterfall2') {
        renderWaterfallBars(slide, rect, tbl2);
        return;
      }
      // 其他图表 → 原生 addChart
      var chartMap = { bar: 'BAR', pie: 'PIE', line: 'LINE', radar: 'RADAR' };
      var pptxType = chartMap[chartType] || 'BAR';
      // PptxGenJS v3 要求 labels 在 series 内部
      var chartSeries = series.map(function(s) {
        return { name: s.name, labels: cats, values: s.values };
      });
      try {
        slide.addChart(pptx.charts[pptxType], chartSeries, {
          x: rect.x, y: rect.y, w: rect.w, h: rect.h,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
          showValue: chartType === 'bar', chartColors: CHART_COLORS
        });
      } catch(e) {}
    }
  });
}
`;