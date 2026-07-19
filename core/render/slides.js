/**
 * slides.js — slide 级渲染：ast._html 生成
 */

const pageTitle = require('../meta-templates/elements/text/page-title');

function renderSlide(ast, config) {
  var type = ast.type;
  if (type === 'stack' || type === 'grid' || type === 'split') {
    ast._html = renderLayoutSlide(ast, type);
  } else {
    ast._html = renderTagSlide(ast);
  }
}

// ── 布局 slide ──

function renderLayoutSlide(ast, type) {
  var blocks = ast.content.blocks || [], title = ast.props.title || '';
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

  function colHTML(bs) {
    return bs.map(function(b) { return '<div style="overflow:hidden;">' + (b._html || '') + '</div>'; }).join('');
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
  var n = els.length, c = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  var gap = 14, startY = title ? 80 : 24, availW = 880, availH = 540 - startY - 20;
  var cardW = (availW - gap * (c - 1)) / c, cardH = (availH - gap * (Math.ceil(n / c) - 1)) / Math.ceil(n / c);

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
  var slideType = ast.type, theme = ast.props.theme || '';
  var isSpecial = slideType === 'title' || slideType === 'section' || slideType === 'ending';
  var slideBg = 'var(--color-bg)';
  if (isSpecial) {
    slideBg = '#1a1a2e';
    if (theme === 'gradient') slideBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  }

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

module.exports = { renderSlide };
