/**
 * html-layout.js — HTML 布局统一入口
 *
 * 三个布局函数均接收标准接口 render(ast, config)。
 * block._html(style) 已由 render.js 预绑定，直接调用即可。
 * 不再查 REGISTRY。
 */

const pageTitle = require('../elements/text/page-title');

// ============================================================
// Stack — 垂直堆叠
// ============================================================

function renderStack(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  const parts = blocks.map(function(b) {
    var s = b.style || {};
    var pos = {
      x: Math.round((s.x !== undefined ? Number(s.x) : 0.6) * 96) + 'px',
      y: Math.round((s.y !== undefined ? Number(s.y) : 0) * 96) + 'px',
      w: Math.round((s.w !== undefined ? Number(s.w) : 8.8) * 96) + 'px',
      h: Math.round((s.h !== undefined ? Number(s.h) : 0.4) * 96) + 'px',
    };
    var pw = Math.round((s.w !== undefined ? Number(s.w) : 8.8) * 96);
    var ph = Math.round((s.h !== undefined ? Number(s.h) : 0.4) * 96);
    var html = b._html ? b._html({ x: 0, y: 0, w: pw, h: ph }) : '';
    return '<div style="position:absolute;left:' + pos.x + ';top:' + pos.y + ';width:' + pos.w + ';height:' + pos.h + ';overflow:hidden;">'
      + html + '</div>';
  }).join('\n');

  return '<div class="slide" style="background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;">'
    + (title ? '<div style="position:absolute;left:40px;top:20px;">' + pageTitle.render(title) + '</div>' : '')
    + parts
    + '</div>';
}

// ============================================================
// Split — 左右分栏
// ============================================================

function renderSplit(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  const raw = blocks.filter(function(b) { return typeof b._html === 'function'; });

  // 找最优分割点：不拆散 H3+list 对
  let mid = Math.ceil(raw.length / 2);
  for (let tryMid = mid; tryMid > 0; tryMid--) {
    if (raw[tryMid] && raw[tryMid].tag === 'list' && tryMid > 0
        && (raw[tryMid - 1].tag === 'h3' || raw[tryMid - 1].tag === 'h4')) continue;
    mid = tryMid; break;
  }

  const leftEls = raw.slice(0, mid);
  const rightEls = raw.slice(mid);

  const gap = 20;
  const startY = title ? 80 : 24;
  const availW = 920, availH = 540 - startY - 20;
  const leftW = Math.floor(availW * 0.5 - gap / 2);
  const rightW = availW - leftW - gap;

  function colHTML(els, colW, colH) {
    let y = 0;
    return els.map(function(el) {
      var es = el.style || {};
      var eh = es.h !== undefined ? Math.round(Number(es.h) * 96) : 40;
      var h = Math.min(eh, colH - y);
      var html = el._html({ x: 0, y: y, w: colW, h: h, 'font-size': es['font-size'], color: es.color, align: es.align });
      y += h + 8;
      return html;
    }).join('');
  }

  return '<div class="slide" style="background:var(--color-bg);padding:' + startY + 'px 20px 20px;">'
    + (title ? pageTitle.render(title) : '')
    + '<div style="display:flex;gap:' + gap + 'px;' + (title ? 'margin-top:12px;' : '') + 'height:' + availH + 'px;">'
    + '<div style="width:' + leftW + 'px;position:relative;overflow:hidden;">' + colHTML(leftEls || [], leftW, availH) + '</div>'
    + '<div style="width:2px;background:var(--color-border);flex-shrink:0;"></div>'
    + '<div style="width:' + rightW + 'px;position:relative;overflow:hidden;">' + colHTML(rightEls || [], rightW, availH) + '</div>'
    + '</div>'
    + '</div>';
}

// ============================================================
// Grid — 网格排列
// ============================================================

function renderGrid(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  const elements = blocks.filter(function(b) { return typeof b._html === 'function'; });
  const n = elements.length;
  const c = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  const gap = 14;
  const startY = title ? 80 : 24;
  const availW = 880, availH = 540 - startY - 20;
  const cardW = (availW - gap * (c - 1)) / c;
  const cardH = (availH - gap * (Math.ceil(n / c) - 1)) / Math.ceil(n / c);

  const cardsHTML = elements.map(function(el) {
    var es = el.style || {};
    var eh = es.h !== undefined ? Math.round(Number(es.h) * 96) : cardH;
    var ew = es.w !== undefined ? Math.round(Number(es.w) * 96) : cardW;
    var elStyle = { x: 0, y: 0, w: ew, h: eh, 'font-size': es['font-size'], color: es.color, align: es.align };
    return '<div style="position:relative;width:' + cardW + 'px;height:' + cardH + 'px;overflow:hidden;">' + el._html(elStyle) + '</div>';
  }).join('');

  return '<div class="slide" style="background:var(--color-bg);padding:' + startY + 'px 40px 20px;">'
    + (title ? pageTitle.render(title) : '')
    + '<div style="display:grid;grid-template-columns:repeat(' + c + ',' + cardW + 'px);gap:' + gap + 'px;justify-content:center;' + (title ? 'margin-top:12px;' : '') + '">'
    + cardsHTML
    + '</div>'
    + '</div>';
}

module.exports = { renderStack, renderSplit, renderGrid };
