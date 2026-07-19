/**
 * elements.js — 调 meta-templates/elements 绑定 _html + _ppt
 */

const AST = require('../meta-templates/types/ast');
const T = AST.TAGS;

const heading   = require('../meta-templates/elements/text/heading');
const paragraph = require('../meta-templates/elements/text/paragraph');
const list      = require('../meta-templates/elements/text/list');
const image     = require('../meta-templates/elements/visual/image');
const box       = require('../meta-templates/elements/visual/box');
const tableEl   = require('../meta-templates/elements/data/table');
const waterfall = require('../meta-templates/elements/data/waterfall');
const chartShell = require('../meta-templates/elements/data/chart-shell');

function pxToIn(px) { return (Number(px) || 0) / 96; }

/** 遍历 blocks，绑定 _html 字符串 + _ppt 描述符 + rect */
function bindElements(blocks, isLayout) {
  if (!blocks || !blocks.length) return;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var tag = block.tag;
    var st = block.style || {};
    var data = block.data || {};

    if (!tag) {
      var type = block.type;
      if (type === 'heading' && data.level) tag = 'h' + data.level;
      else if (type === 'paragraph') tag = 'p';
      else if (type === 'list') tag = 'list';
      else if (type === 'image') tag = 'img';
      block.tag = tag;
    }

    if (block.pos && block.pos.inches) {
      block.rect = block.pos.inches;
    } else if (isLayout) {
      block.rect = { x: Number(st.x) || 0.6, y: Number(st.y) || 0.3, w: Number(st.w) || 8.8, h: Number(st.h) || 0.4 };
    } else {
      block.rect = { x: pxToIn(st.x), y: pxToIn(st.y), w: pxToIn(st.w || 820), h: pxToIn(st.h || 40) };
    }

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': bindHeading(block, parseInt(tag[1]), data); break;
      case 'p': bindParagraph(block, data); break;
      case 'list': bindList(block, data); break;
      case 'table': bindTable(block, data); break;
      case 'img': bindImage(block, data); break;
      case 'box': bindBox(block); break;
      case 'chart': bindChart(block, data, st); break;
      default: block._html = ''; block._ppt = null;
    }
  }
}

function bindHeading(block, level, data) {
  var st = block.style || {};
  var tag = 'h' + level;
  var fs = Number(st['font-size']) || Number((T[tag]||{}).fs) || 18;
  block._html = heading.render(level, data.text, { 'font-size': fs, color: st.color, bold: st.bold, align: st.align });
  block._ppt = { action: 'addText', text: data.text || '', fontSize: fs, bold: st.bold === 'true' || level <= 2, color: st.color || '333333', align: st.align || 'left', fontFace: 'Microsoft YaHei' };
}

function bindParagraph(block, data) {
  var st = block.style || {};
  var fs = Number(st['font-size']) || Number((T.p||{}).fs) || 13;
  block._html = paragraph.render(data.text, data.inlineMarkup, { 'font-size': fs, color: st.color || '555555', align: st.align || 'left' });
  var runs = (data.runs && data.runs.length > 0) ? data.runs : [{ text: data.text || '', options: {} }];
  block._ppt = { action: 'addText', runs: runs, fontSize: fs, color: st.color || '555555', align: st.align || 'left', fontFace: 'Microsoft YaHei', valign: 'top' };
}

function bindList(block, data) {
  var st = block.style || {};
  var lfs = Number(st['font-size']) || Number((T.list||{}).fs) || 12;
  block._html = list.render(data.items, data.ordered, { 'font-size': lfs, color: st.color || '444444' });
  var listItems = data.items || [], actions = [];
  for (var i = 0; i < listItems.length; i++) {
    var item = listItems[i], prefix = data.ordered ? (i + 1) + '. ' : '▸  ', itemRuns;
    if (item.runs && item.runs.length > 0) {
      itemRuns = [{ text: prefix, options: { color: '667eea', fontSize: lfs } }].concat(item.runs);
    } else {
      itemRuns = [{ text: prefix, options: { color: '667eea', fontSize: lfs } }, { text: item.text || '', options: { fontSize: lfs, color: st.color || '444444' } }];
    }
    actions.push({ action: 'addText', runs: itemRuns, fontSize: lfs, fontFace: 'Microsoft YaHei' });
  }
  block._ppt = { action: 'addListItems', items: actions };
}

function bindTable(block, data) {
  var st = block.style || {};
  var tblfs = Number(st['font-size']) || Number((T.table||{}).fs) || 11;
  block._html = tableEl.render(data.headers, data.rows, { 'font-size': tblfs });
  var nCols = data.headers ? data.headers.length : 1;
  var TK = { pt: 2, color: '1a1a1a', type: 'solid' }, HD = { pt: 1.5, color: '1a1a1a', type: 'solid' }, N = null;
  var pptRows = [data.headers.map(function(h) {
    return { text: h, options: { bold: true, fontSize: tblfs, color: '1a1a1a', align: 'center', fontFace: 'Microsoft YaHei', border: [TK, N, HD, N] }};
  })];
  if (data.rows) {
    data.rows.forEach(function(row, ri) {
      var isLast = ri === data.rows.length - 1;
      pptRows.push(row.map(function(c) {
        return { text: c, options: { fill: { color: ri % 2 === 0 ? 'F9FAFB' : 'FFFFFF' }, align: 'center', fontFace: 'Microsoft YaHei', fontSize: tblfs - 1, color: '333333', border: isLast ? [N, N, TK, N] : [N, N, N, N] }};
      }));
    });
  }
  block._ppt = { action: 'addTable', rows: pptRows, colW: data.headers.map(function(_, ci) { return ci === 0 ? 0.35 : 0.65 / (nCols - 1); }), rowH: 0.3 };
}

function bindImage(block, data) {
  block._html = image.render(data.src, data.label, {});
  block._ppt = { action: 'addImage', imgSrc: data.src || '', label: data.label || '' };
}

function bindBox(block) {
  var st = block.style || {};
  block._html = box.render({ 'fill-color': st['fill-color'], 'border-color': st['border-color'], 'border-width': st['border-width'], 'border-radius': st['border-radius'] });
  block._ppt = { action: 'addShape', shapeType: 'rect', fill: st['fill-color'] || null, line: st['border-color'] ? { color: st['border-color'], width: Number(st['border-width']) || 0.5 } : null, rectRadius: st['border-radius'] ? Number(st['border-radius']) / 96 : 0.05 };
}

function bindChart(block, data, st) {
  var ct = (st.chartType || st.type || 'bar').toLowerCase();
  if (ct === 'waterfall' || ct === 'waterfall2') {
    block._html = waterfall.render((data.rows || []).map(function(r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; }), '', 'chart_reg', {});
    block._ppt = { action: 'addWaterfall', chartType: ct, chartData: { categories: data.rows.map(function(r) { return r[0]; }), series: buildSeries(data) } };
  } else {
    block._html = chartShell.render('chart_reg', { tooltip: {}, xAxis: { type: 'category', data: (data.rows || []).map(function(r) { return r[0]; }) }, yAxis: {}, series: [{ type: ct, data: (data.rows || []).map(function(r) { return parseFloat(r[1]) || 0; }) }] }, {});
    block._ppt = { action: 'addChart', chartType: ct.toUpperCase(), chartData: buildSeries(data), showLegend: ct === 'pie' || ct === 'doughnut' || buildSeries(data).length > 1 };
  }
}

function buildSeries(data) {
  var series = [];
  for (var col = 1; col < (data.headers ? data.headers.length : 1); col++) {
    series.push({ name: data.headers[col], labels: data.rows ? data.rows.map(function(r) { return r[0]; }) : [], values: data.rows ? data.rows.map(function(r) { return parseFloat(r[col]) || 0; }) : [] });
  }
  return series;
}

module.exports = { bindElements };
