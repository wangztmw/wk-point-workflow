module.exports = `
// ============================================================
// 标签语法 PPT 导出（遍历 blocks，按 tag 分发）
// ============================================================

function pxToIn(px) { return (Number(px) || 0) / 96; }

// 文字自适应：估算文本框能容纳的最大字符数
function fitChars(boxW, boxH, fs, lh) {
  var cpl = Math.floor((boxW||820) / (fs||13) / 0.7);      // 每行字符数
  var maxLines = Math.max(1, Math.floor((boxH||40) / ((fs||13) * (lh||1.6))));  // 最大行数
  return { cpl: cpl, maxLines: maxLines, total: cpl * maxLines };
}

// 多元素slide中的瀑布图：简单柱形渲染到已有slide
function renderWaterfallBars(slide, rect, tbl) {
  var rows = tbl.rows || [];
  if (rows.length < 3) return;
  var rawData = rows.map(function(r){ return {name:r[0], value:parseFloat(r[1])||0}; });
  var n = rawData.length;
  var barW = (rect.w - 0.2) / n * 0.55;
  var stepX = (rect.w - 0.2) / n;
  var baseY = rect.y + rect.h - 0.3;
  // 计算Y范围
  var cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (var i = 1; i < n - 1; i++) { cumVal += rawData[i].value; if (cumVal > cumMax) cumMax = cumVal; }
  var endV = rawData[n-1].value; if (endV > cumMax) cumMax = endV;
  var scale = (rect.h - 0.8) / (cumMax * 1.08 || 1);
  var cumulative = 0;
  rawData.forEach(function(d, i){
    var cx = rect.x + 0.1 + i * stepX + (stepX - barW) / 2;
    var color, barH, barY;
    if (i === 0) {
      barH = Math.abs(d.value) * scale; barY = baseY - barH;
      color = '2563EB';
    } else if (i === n - 1) {
      barH = d.value * scale; barY = baseY - barH;
      color = '2563EB';
    } else {
      if (d.value >= 0) {
        barH = d.value * scale; barY = baseY - cumulative * scale - barH;
        color = '16A34A';
      } else {
        barH = Math.abs(d.value) * scale; barY = baseY - (cumulative + d.value) * scale;
        color = 'DC2626';
      }
      cumulative += d.value;
    }
    if (barH < 0.05) barH = 0.05;
    slide.addShape('rect', { x: cx, y: barY, w: barW, h: barH, fill: { color: color }, rectRadius: 0.02 });
    slide.addText(d.name, { x: cx - stepX*0.15, y: baseY + 0.05, w: barW + stepX*0.3, h: 0.2, fontSize: 6, color: '888888', align: 'center', fontFace: 'Microsoft YaHei' });
    slide.addText(String(d.value), { x: cx, y: barY - 0.18, w: barW, h: 0.15, fontSize: 7, color: color, align: 'center', fontFace: 'Microsoft YaHei', bold: true });
  });
}

function truncText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).replace(/\\s+$/, '') + '\\u2026';
}

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

  if (!s.blocks) return;
  s.blocks.forEach(function(block) {
    var st = block.style || {};
    var tag = block.tag;
    var rect = {
      x: pxToIn(st.x),
      y: pxToIn(st.y),
      w: pxToIn(st.w || 820),
      h: pxToIn(st.h || 40)
    };

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
      var iy = rect.y;
      items.forEach(function(item) {
        if (iy > rect.y + rect.h - 0.1) return;
        var prefix = block.data.ordered ? '1. ' : '\\u25b8  ';
        var runs = [{ text: prefix, options: { color: '667eea', fontSize: fs } }];
        if (item.runs) runs = runs.concat(item.runs);
        else runs.push({ text: item.text || '', options: { fontSize: fs, color: st.color || '444444' } });
        slide.addText(runs, {
          x: rect.x + 0.1, y: iy, w: rect.w - 0.2, h: 0.28,
          fontSize: fs, fontFace: 'Microsoft YaHei'
        });
        iy += 0.26;
      });
    }
    else if (tag === 'table') {
      var tbl = block.data;
      if (!tbl || !tbl.headers) return;
      var fs = Number(st['font-size']) || 11;
      var nCols = tbl.headers.length;
      var TK = { pt: 2, color: '1a1a1a', type: 'solid' };
      var HD = { pt: 1.5, color: '1a1a1a', type: 'solid' };
      var N = { type: 'none' };
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
      try {
        slide.addChart(pptx.charts[pptxType], series, {
          x: rect.x, y: rect.y, w: rect.w, h: rect.h,
          catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
          showValue: chartType === 'bar', chartColors: CHART_COLORS
        });
      } catch(e) {}
    }
  });
}
`;