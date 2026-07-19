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

const heading   = require('../meta-templates/elements/text/heading');
const paragraph = require('../meta-templates/elements/text/paragraph');
const list      = require('../meta-templates/elements/text/list');
const image     = require('../meta-templates/elements/visual/image');
const box       = require('../meta-templates/elements/visual/box');
const tableEl   = require('../meta-templates/elements/data/table');
const waterfall = require('../meta-templates/elements/data/waterfall');
const chartShell = require('../meta-templates/elements/data/chart-shell');

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

    // ── Markdown block 类型 → tag 映射（让旧模板也能用 _html）──
    if (!tag) {
      var type = block.type;
      if (type === 'heading' && data.level) tag = 'h' + data.level;
      else if (type === 'paragraph') tag = 'p';
      else if (type === 'list') tag = 'list';
      else if (type === 'image') tag = 'img';
      block.tag = tag;
    }

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
        block._html = '';
        block._ppt = null;
    }
  }
}

// ============================================================
// 各元素的 _html 绑定 + _ppt 生成
// ============================================================

function bindHeading(block, level, data) {
  var st = block.style || {};
  var fs = Number(st['font-size']) || (level === 1 ? 32 : level === 2 ? 24 : level === 3 ? 18 : 15);
  // 流模式：不传 x/y/w/h，元素模板输出纯内容 HTML（无外层定位 div）
  block._html = heading.render(level, data.text, {
    'font-size': fs, color: st.color,
    bold: st.bold, align: st.align,
  });

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
  block._html = paragraph.render(data.text, data.inlineMarkup, {
    'font-size': st['font-size'] || 13,
    color: st.color || '555555',
    align: st.align || 'left',
  });

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
  block._html = list.render(data.items, data.ordered, {
    'font-size': st['font-size'] || 12,
    color: st.color || '444444',
  });

  var listItems = data.items || [];
  var lfs = Number(st['font-size']) || 12;
  var actions = [];

  for (var i = 0; i < listItems.length; i++) {
    var item = listItems[i];
    var prefix = data.ordered ? (i + 1) + '. ' : '▸  ';
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
  block._html = tableEl.render(data.headers, data.rows, {
    'font-size': st['font-size'] || 13,
  });

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
  block._html = image.render(data.src, data.label, {});

  block._ppt = {
    action: 'addImage',
    imgSrc: data.src || '',
    label: data.label || '',
  };
}

function bindBox(block) {
  var st = block.style || {};
  block._html = box.render({
    'fill-color': st['fill-color'],
    'border-color': st['border-color'],
    'border-width': st['border-width'],
    'border-radius': st['border-radius'],
  });

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
    var wfRows = (data.rows || []).map(function(r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; });
    block._html = waterfall.render(wfRows, '', 'chart_reg', {});

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
    var chartRows = (data.rows || []).map(function(r) { return { name: r[0], value: parseFloat(r[1]) || 0 }; });
    var opt = {
      tooltip: {},
      xAxis: { type: 'category', data: chartRows.map(function(r) { return r.name; }) },
      yAxis: {},
      series: [{ type: ct, data: chartRows.map(function(r) { return r.value; }) }],
    };
    block._html = chartShell.render('chart_reg', opt, {});

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

// ============================================================
// Slide 级渲染：生成 ast._html（最终 HTML 字符串）
// ============================================================

const pageTitle = require('../meta-templates/elements/text/page-title');

/**
 * 为 slide 生成最终 HTML 字符串，存入 ast._html。
 * 应在 applyLayout + renderBlocks 之后调用。
 */
function renderSlide(ast, config) {
  var type = ast.type;
  if (type === 'stack' || type === 'grid' || type === 'split') {
    ast._html = renderLayoutSlide(ast, type);
  } else {
    ast._html = renderTagSlide(ast);
  }
}

// ── 布局 slide（stack/split/grid）──

function renderLayoutSlide(ast, type) {
  var blocks = ast.content.blocks || [];
  var title = ast.props.title || '';

  if (type === 'stack') return renderStack(blocks, title);
  if (type === 'split') return renderSplit(blocks, title);
  if (type === 'grid')  return renderGrid(blocks, title);
  return '';
}

function renderStack(blocks, title) {
  var parts = blocks.filter(function(b) { return !b._skip; }).map(function(b) {
    var s = b.style || {};
    var x = Math.round((s.x !== undefined ? Number(s.x) : 0.6) * 96);
    var y = Math.round((s.y !== undefined ? Number(s.y) : 0) * 96);
    var w = Math.round((s.w !== undefined ? Number(s.w) : 8.8) * 96);
    var h = Math.round((s.h !== undefined ? Number(s.h) : 0.4) * 96);
    return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;overflow:hidden;">'
      + (b._html || '') + '</div>';
  }).join('\n');

  return '<div class="slide" style="background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;">'
    + (title ? '<div style="position:absolute;left:40px;top:20px;">' + pageTitle.render(title) + '</div>' : '')
    + parts + '</div>';
}

function renderSplit(blocks, title) {
  var raw = blocks.filter(function(b) { return b._html && !b._skip; });
  var mid = Math.ceil(raw.length / 2);
  for (var tryMid = mid; tryMid > 0; tryMid--) {
    if (raw[tryMid] && raw[tryMid].tag === 'list' && tryMid > 0
        && (raw[tryMid - 1].tag === 'h3' || raw[tryMid - 1].tag === 'h4')) continue;
    mid = tryMid; break;
  }
  var leftBs = raw.slice(0, mid), rightBs = raw.slice(mid);
  var gap = 20, startY = title ? 80 : 24, availW = 920, availH = 540 - startY - 20;
  var leftW = Math.floor(availW * 0.5 - gap / 2), rightW = availW - leftW - gap;

  function colHTML(bs, colW) {
    return bs.map(function(b) {
      return '<div style="overflow:hidden;">' + (b._html || '') + '</div>';
    }).join('');
  }

  return '<div class="slide" style="background:var(--color-bg);padding:' + startY + 'px 20px 20px;">'
    + (title ? pageTitle.render(title) : '')
    + '<div style="display:flex;gap:' + gap + 'px;' + (title ? 'margin-top:12px;' : '') + 'height:' + availH + 'px;">'
    + '<div style="width:' + leftW + 'px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">' + colHTML(leftBs) + '</div>'
    + '<div style="width:2px;background:var(--color-border);flex-shrink:0;"></div>'
    + '<div style="width:' + rightW + 'px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">' + colHTML(rightBs) + '</div>'
    + '</div></div>';
}

function renderGrid(blocks, title) {
  var els = blocks.filter(function(b) { return b._html && !b._skip; });
  var n = els.length;
  var c = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  var gap = 14, startY = title ? 80 : 24, availW = 880, availH = 540 - startY - 20;
  var cardW = (availW - gap * (c - 1)) / c;
  var cardH = (availH - gap * (Math.ceil(n / c) - 1)) / Math.ceil(n / c);

  var cards = els.map(function(b) {
    return '<div style="position:relative;width:' + cardW + 'px;height:' + cardH + 'px;overflow:hidden;">'
      + (b._html || '') + '</div>';
  }).join('');

  return '<div class="slide" style="background:var(--color-bg);padding:' + startY + 'px 40px 20px;">'
    + (title ? pageTitle.render(title) : '')
    + '<div style="display:grid;grid-template-columns:repeat(' + c + ',' + cardW + 'px);gap:' + gap + 'px;justify-content:center;' + (title ? 'margin-top:12px;' : '') + '">'
    + cards + '</div></div>';
}

// ── 非布局 tag slide ──

function renderTagSlide(ast) {
  var blocks = ast.content.blocks || [];
  var slideType = ast.type;
  var theme = ast.props.theme || '';
  var isSpecial = slideType === 'title' || slideType === 'section' || slideType === 'ending';
  var slideBg = 'var(--color-bg)';
  if (isSpecial) {
    slideBg = '#1a1a2e';
    if (theme === 'gradient') {
      slideBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  // 元素拼接：深色 slide 用 flex 居中（忽略坐标），其他有坐标的用绝对定位
  var elements = blocks.map(function(b) {
    var html = b._html || '';
    if (!html) return '';
    var s = b.style || {};
    var hasPos = !isSpecial && (s.x !== undefined || s.y !== undefined);
    if (hasPos) {
      return '<div style="position:absolute;left:' + (s.x||0) + 'px;top:' + (s.y||0) + 'px;'
        + 'width:' + (s.w||'auto') + 'px;height:' + (s.h||'auto') + 'px;overflow:hidden;">' + html + '</div>';
    }
    return html;
  }).filter(Boolean).join('\n');

  var containerStyle = isSpecial
    ? 'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;'
    : 'position:relative;';
  return '<div class="slide slide-tag" style="background:' + slideBg + ';' + containerStyle + 'width:960px;height:540px;overflow:hidden;">'
    + elements + '</div>';
}

module.exports = { renderBlocks, renderSlide };
