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

function truncText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).replace(/\\s+$/, '') + '\\u2026';
}

function addTagSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  // 暗色幻灯片：title / section / ending
  var isDark = s.type === 'title' || s.type === 'section' || s.type === 'ending';
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
      // 委托原生图表渲染
      var tbl2 = block.data;
      if (!tbl2 || !tbl2.headers || tbl2.headers.length < 2) return;
      var chartType = (st.chartType || st.type || 'bar').toLowerCase();
      var cats = tbl2.rows.map(function(r) { return r[0]; });
      var series = [];
      for (var col = 1; col < tbl2.headers.length; col++) {
        series.push({ name: tbl2.headers[col], values: tbl2.rows.map(function(r) { return parseFloat(r[col]) || 0; }) });
      }
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