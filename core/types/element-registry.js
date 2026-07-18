/**
 * element-registry.js — 元素级注册表
 *
 * tag → {html, ppt} 渲染函数对。HTML 和 PPT 都查这张表。
 * 加新元素：在此文件加一行 + 写渲染函数即可。
 */

// ============================================================
// PPT 端渲染函数（浏览器侧，通过 assemble toString 嵌入）
// ============================================================

function pptHeading(slide, data, style, rect, level) {
  var fs = Number(style['font-size']) || (level===1?32:level===2?24:level===3?18:15);
  var txt = truncText(data.text || '', fitChars(rect.w*96, rect.h*96, fs, 1.3).total);
  slide.addText(txt, {
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    fontSize: fs, bold: style.bold === 'true' || level <= 2,
    color: style.color || '333333', align: style.align || 'left',
    fontFace: 'Microsoft YaHei'
  });
}

function pptParagraph(slide, data, style, rect) {
  var fs = Number(style['font-size']) || 13;
  var rawRuns = (data.runs && data.runs.length > 0) ? data.runs : [{ text: data.text || '', options: {} }];
  var fullText = rawRuns.map(function(r){return r.text||'';}).join('');
  var fc = fitChars(rect.w*96, rect.h*96, fs, 1.6);
  var truncated = truncText(fullText, fc.total);
  var runs = [{ text: truncated, options: { fontSize: fs, color: style.color || '555555' } }];
  slide.addText(runs, {
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    fontSize: fs, color: style.color || '555555', align: style.align || 'left',
    fontFace: 'Microsoft YaHei', valign: 'top'
  });
}

function pptList(slide, data, style, rect) {
  var fs = Number(style['font-size']) || 12;
  var items = data.items || [];
  var itemW = rect.w - 0.2;
  var cpl = Math.floor(itemW * 96 / (fs * 1.0)); if (cpl < 1) cpl = 1;
  var iy = rect.y;
  items.forEach(function(item){
    if (iy > rect.y + rect.h - 0.1) return;
    var t = item.text || '';
    var lines = Math.ceil(t.length / cpl);
    var itemH = Math.max(0.28, lines * fs / 96 * 2.0 + 0.04);
    var prefix = data.ordered ? '1. ' : '▸  ';
    var runs = [{ text: prefix, options: { color: '667eea', fontSize: fs } }];
    if (item.runs) runs = runs.concat(item.runs);
    else runs.push({ text: t, options: { fontSize: fs, color: style.color || '444444' } });
    slide.addText(runs, { x: rect.x + 0.1, y: iy, w: rect.w - 0.2, h: itemH, fontSize: fs, fontFace: 'Microsoft YaHei' });
    iy += itemH + 0.02;
  });
}

function pptTable(slide, data, style, rect) {
  var tbl = data;
  if (!tbl || !tbl.headers) return;
  var fs = Number(style['font-size']) || 11;
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
    colW: tbl.headers.map(function(_, ci) { return ci === 0 ? rect.w*0.35 : (rect.w*0.65)/(nCols-1); }),
    rowH: 0.3
  });
}

function pptImage(slide, data, style, rect) {
  var src = data.src || '', label = data.label || '';
  if (src && src.length > 100) {
    try { slide.addImage({ data: src, x: rect.x, y: rect.y, w: rect.w, h: rect.h, sizing: { type: 'contain', w: rect.w, h: rect.h } }); } catch(e) {}
  } else {
    slide.addShape('rect', { x: rect.x, y: rect.y, w: rect.w, h: rect.h, fill: { color: 'F5F5F5' }, line: { color: 'CCCCCC', width: 0.5, dashType: 'dash' }, rectRadius: 0.05 });
    if (label) slide.addText(label, { x: rect.x, y: rect.y + rect.h/2 - 0.15, w: rect.w, h: 0.3, fontSize: 11, bold: true, color: '999999', align: 'center', fontFace: 'Microsoft YaHei' });
  }
}

function pptBox(slide, data, style, rect) {
  var opts = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  if (style['fill-color']) opts.fill = { color: style['fill-color'] };
  if (style['border-color']) opts.line = { color: style['border-color'], width: Number(style['border-width']) || 0.5 };
  slide.addShape('rect', opts);
}

function pptChart(slide, data, style, rect) {
  var tbl2 = data;
  if (!tbl2 || !tbl2.headers || tbl2.headers.length < 2) return;
  var chartType = (style.chartType || 'bar').toLowerCase();
  if (chartType === 'waterfall' || chartType === 'waterfall2') {
    renderWaterfallBars(slide, rect, tbl2); return;
  }
  var cats = tbl2.rows.map(function(r){return r[0];});
  var series = [];
  for (var col = 1; col < tbl2.headers.length; col++) {
    series.push({ name: tbl2.headers[col], values: tbl2.rows.map(function(r){return parseFloat(r[col])||0;}) });
  }
  var chartMap = { bar: 'BAR', pie: 'PIE', line: 'LINE', radar: 'RADAR' };
  var pptxType = chartMap[chartType] || 'BAR';
  var chartSeries = series.map(function(s){ return { name: s.name, labels: cats, values: s.values }; });
  try {
    slide.addChart(pptx.charts[pptxType], chartSeries, {
      x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
      showValue: chartType === 'bar', chartColors: CHART_COLORS
    });
  } catch(e) {}
}

// ============================================================
// 注册表
// ============================================================

// HTML 端：require 元素模块
const heading  = require('../../templates/elements/text/heading');
const paragraph = require('../../templates/elements/text/paragraph');
const list      = require('../../templates/elements/text/list');
const image     = require('../../templates/elements/visual/image');
const box       = require('../../templates/elements/visual/box');
const tableEl   = require('../../templates/elements/data/table');
const waterfall = require('../../templates/elements/data/waterfall');
const chartShell = require('../../templates/elements/data/chart-shell');

const REGISTRY = {
  h1: { ppt: pptHeading },
  h2: { ppt: pptHeading },
  h3: { ppt: pptHeading },
  h4: { ppt: pptHeading },
  p:  { ppt: pptParagraph },
  list: { ppt: pptList },
  table: { ppt: pptTable },
  img: { ppt: pptImage },
  box: { ppt: pptBox },
  chart: { ppt: pptChart },
};

// HTML 端：tag → 渲染函数（直接调用元素模块）
REGISTRY.h1.html = (data, style) => heading.render(1, data.text, style);
REGISTRY.h2.html = (data, style) => heading.render(2, data.text, style);
REGISTRY.h3.html = (data, style) => heading.render(3, data.text, style);
REGISTRY.h4.html = (data, style) => heading.render(4, data.text, style);
REGISTRY.p.html   = (data, style) => paragraph.render(data.text, data.runs ? {type:'paragraph', inlineMarkup:[]} : null, style);
REGISTRY.list.html = (data, style) => list.render(data.items, data.ordered, style);
REGISTRY.table.html = (data, style) => tableEl.render(data.headers, data.rows, style);
REGISTRY.img.html = (data, style) => image.render(data.src, data.label, style);
REGISTRY.box.html = (data, style) => box.render(style);
REGISTRY.chart.html = (data, style) => {
  var ct = (style.chartType || 'bar').toLowerCase();
  var rows = (data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
  if (ct === 'waterfall' || ct === 'waterfall2') return waterfall.render(rows, '', 'chart_reg', style);
  var opt = { tooltip:{}, xAxis:{type:'category',data:rows.map(r=>r.name)}, yAxis:{}, series:[{type:ct,data:rows.map(r=>r.value)}] };
  return chartShell.render('chart_reg', opt, style);
};

// 导出
module.exports = { REGISTRY, pptHeading, pptParagraph, pptList, pptTable, pptImage, pptBox, pptChart };
