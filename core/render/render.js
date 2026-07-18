/**
 * render.js — 统一渲染层
 *
 * 为 AST 的每个 block 一次性生成：
 *   block._html(styleOverride) — 预绑定的 HTML 渲染函数（调用方传像素 style）
 *   block._ppt                 — PPT 动作描述符（引擎直接执行）
 *   block.rect                 — 归一化的英寸坐标（PPT 端使用）
 *
 * HTML/PPT 引擎不再需要查 REGISTRY 或调元素模板。
 */

const heading   = require('../../templates/elements/text/heading');
const paragraph = require('../../templates/elements/text/paragraph');
const list      = require('../../templates/elements/text/list');
const image     = require('../../templates/elements/visual/image');
const box       = require('../../templates/elements/visual/box');
const tableEl   = require('../../templates/elements/data/table');
const waterfall = require('../../templates/elements/data/waterfall');
const chartShell = require('../../templates/elements/data/chart-shell');

function pxToIn(px) { return (Number(px) || 0) / 96; }

/**
 * @param {Object[]} blocks    — AST content.blocks
 * @param {boolean}  isLayout  — true=stack/split/grid（英寸坐标），false=其他（像素坐标）
 */
function renderBlocks(blocks, isLayout) {
  if (!blocks || !blocks.length) return;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var tag = block.tag;
    var st = block.style || {};
    var data = block.data || {};

    // ── 归一化 rect 为英寸（PPT 端 executeBlock 使用）──
    if (isLayout) {
      block.rect = {
        x: st.x !== undefined ? Number(st.x) : 0.6,
        y: st.y !== undefined ? Number(st.y) : 0.3,
        w: st.w !== undefined ? Number(st.w) : 8.8,
        h: st.h !== undefined ? Number(st.h) : 0.4,
      };
    } else {
      block.rect = {
        x: pxToIn(st.x),
        y: pxToIn(st.y),
        w: pxToIn(st.w || 820),
        h: pxToIn(st.h || 40),
      };
    }

    // ── 绑定 _html 函数 + 生成 _ppt 描述符 ──
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4':
        bindHeading(block, parseInt(tag[1]), data);
        break;
      case 'p':
        bindParagraph(block, data);
        break;
      case 'list':
        bindList(block, data);
        break;
      case 'table':
        bindTable(block, data);
        break;
      case 'img':
        bindImage(block, data);
        break;
      case 'box':
        bindBox(block);
        break;
      case 'chart':
        bindChart(block, data, st);
        break;
      default:
        block._html = function() { return ''; };
        block._ppt = null;
    }
  }
}

// ============================================================
// 各元素的 _html 绑定 + _ppt 生成
// ============================================================

function bindHeading(block, level, data) {
  var st = block.style || {};
  block._html = (function(lv, d) {
    return function(s) { return heading.render(lv, d.text, s); };
  })(level, data);

  var fs = Number(st['font-size']) || (level === 1 ? 32 : level === 2 ? 24 : level === 3 ? 18 : 15);
  block._ppt = {
    action: 'addText',
    text: data.text || '',
    fontSize: fs,
    bold: st.bold === 'true' || level <= 2,
    color: st.color || '333333',
    align: st.align || 'left',
    fontFace: 'Microsoft YaHei',
  };
}

function bindParagraph(block, data) {
  var st = block.style || {};
  block._html = (function(d) {
    return function(s) { return paragraph.render(d.text, d.inlineMarkup, s); };
  })(data);

  var runs = (data.runs && data.runs.length > 0) ? data.runs : [{ text: data.text || '', options: {} }];
  block._ppt = {
    action: 'addText',
    runs: runs,
    fontSize: Number(st['font-size']) || 13,
    color: st.color || '555555',
    align: st.align || 'left',
    fontFace: 'Microsoft YaHei',
    valign: 'top',
  };
}

function bindList(block, data) {
  var st = block.style || {};
  block._html = (function(d) {
    return function(s) { return list.render(d.items, d.ordered, s); };
  })(data);

  var listItems = data.items || [];
  var lfs = Number(st['font-size']) || 12;
  var prefix = data.ordered ? '1. ' : '▸  ';
  var actions = [];

  for (var i = 0; i < listItems.length; i++) {
    var item = listItems[i];
    var itemRuns;
    if (item.runs && item.runs.length > 0) {
      itemRuns = [{ text: prefix, options: { color: '667eea', fontSize: lfs } }].concat(item.runs);
    } else {
      itemRuns = [
        { text: prefix, options: { color: '667eea', fontSize: lfs } },
        { text: item.text || '', options: { fontSize: lfs, color: st.color || '444444' } },
      ];
    }
    actions.push({
      action: 'addText',
      runs: itemRuns,
      fontSize: lfs,
      fontFace: 'Microsoft YaHei',
    });
  }

  block._ppt = {
    action: 'addListItems',
    items: actions,
  };
}

function bindTable(block, data) {
  var st = block.style || {};
  block._html = (function(d) {
    return function(s) { return tableEl.render(d.headers, d.rows, s); };
  })(data);

  var nCols = data.headers ? data.headers.length : 1;
  var tblfs = Number(st['font-size']) || 11;
  var TK = { pt: 2, color: '1a1a1a', type: 'solid' };
  var HD = { pt: 1.5, color: '1a1a1a', type: 'solid' };
  var N = null;

  var pptRows = [data.headers.map(function(h) {
    return { text: h, options: { bold: true, fontSize: tblfs, color: '1a1a1a', align: 'center', fontFace: 'Microsoft YaHei', border: [TK, N, HD, N] }};
  })];

  if (data.rows) {
    data.rows.forEach(function(row, ri) {
      var isLast = ri === data.rows.length - 1;
      pptRows.push(row.map(function(c) {
        return { text: c, options: {
          fill: { color: ri % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
          align: 'center', fontFace: 'Microsoft YaHei', fontSize: tblfs - 1, color: '333333',
          border: isLast ? [N, N, TK, N] : [N, N, N, N],
        }};
      }));
    });
  }

  block._ppt = {
    action: 'addTable',
    rows: pptRows,
    colW: data.headers.map(function(_, ci) { return ci === 0 ? 0.35 : 0.65 / (nCols - 1); }),
    rowH: 0.3,
  };
}

function bindImage(block, data) {
  block._html = (function(d) {
    return function(s) { return image.render(d.src, d.label, s); };
  })(data);

  block._ppt = {
    action: 'addImage',
    imgSrc: data.src || '',
    label: data.label || '',
  };
}

function bindBox(block) {
  var st = block.style || {};
  block._html = (function() {
    return function(s) { return box.render(s); };
  })();

  block._ppt = {
    action: 'addShape',
    shapeType: 'rect',
    fill: st['fill-color'] || null,
    line: st['border-color'] ? { color: st['border-color'], width: Number(st['border-width']) || 0.5 } : null,
    rectRadius: st['border-radius'] ? Number(st['border-radius']) / 96 : 0.05,
  };
}

function bindChart(block, data, st) {
  var ct = (st.chartType || st.type || 'bar').toLowerCase();

  if (ct === 'waterfall' || ct === 'waterfall2') {
    block._html = (function(d, cht) {
      return function(s) {
        var wfRows = (d.rows || []).map(function(r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; });
        return waterfall.render(wfRows, '', 'chart_reg', s);
      };
    })(data, ct);

    var wfCats = data.rows.map(function(r) { return r[0]; });
    var wfSeries = [];
    for (var c = 1; c < (data.headers ? data.headers.length : 1); c++) {
      wfSeries.push({ name: data.headers[c], values: data.rows.map(function(r) { return parseFloat(r[c]) || 0; }) });
    }
    block._ppt = {
      action: 'addWaterfall',
      chartType: ct,
      chartData: { categories: wfCats, series: wfSeries },
    };
  } else {
    block._html = (function(d, cht) {
      return function(s) {
        var chartRows = (d.rows || []).map(function(r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; });
        var opt = {
          tooltip: {},
          xAxis: { type: 'category', data: chartRows.map(function(r) { return r.name; }) },
          yAxis: {},
          series: [{ type: cht, data: chartRows.map(function(r) { return r.value; }) }],
        };
        return chartShell.render('chart_reg', opt, s);
      };
    })(data, ct);

    var cats = data.rows ? data.rows.map(function(r) { return r[0]; }) : [];
    var seriesArr = [];
    for (var col = 1; col < (data.headers ? data.headers.length : 1); col++) {
      seriesArr.push({
        name: data.headers[col],
        labels: cats,
        values: data.rows.map(function(r) { return parseFloat(r[col]) || 0; }),
      });
    }
    var isPie = ct === 'pie' || ct === 'doughnut';
    block._ppt = {
      action: 'addChart',
      chartType: ct.toUpperCase(),
      chartData: seriesArr,
      showLegend: isPie || seriesArr.length > 1,
    };
  }
}

module.exports = { renderBlocks };
