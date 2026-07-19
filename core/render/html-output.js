/**
 * html-output.js — HTML 引擎适配层：ast._html 生成
 * 只读 block.pos.pixels + block._html，不做任何计算。
 * pageTitle 由 layout/assemble.js 预渲染到 ast._titleHTML。
 */

function renderSlide(ast, config) {
  var type = ast.type;
  if (type === 'stack' || type === 'grid' || type === 'split') {
    ast._html = renderLayoutSlide(ast, type);
  } else {
    ast._html = renderTagSlide(ast);
  }
}

// ── 布局 slide：绝对定位包裹 ──

function renderLayoutSlide(ast, type) {
  var blocks = ast.content.blocks || [], titleHTML = ast._titleHTML || '';
  if (type === 'stack') return renderStack(blocks, titleHTML);
  if (type === 'split') return renderSplit(blocks, titleHTML);
  if (type === 'grid')  return renderGrid(blocks, titleHTML);
  return '';
}

function renderStack(blocks, titleHTML) {
  var parts = blocks.filter(function(b) { return !b._skip && b.pos; }).map(function(b) {
    var p = b.pos.pixels;
    return '<div style=\"position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;height:' + p.h + 'px;overflow:hidden;\">'
      + (b._html || '') + '</div>';
  }).join('\n');

  return '<div class=\"slide\" style=\"background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;\">'
    + titleHTML + parts + '</div>';
}

function renderSplit(blocks, titleHTML) {
  var parts = blocks.filter(function(b) { return !b._skip && b.pos; }).map(function(b) {
    var p = b.pos.pixels;
    return '<div style=\"position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;height:' + p.h + 'px;overflow:hidden;\">'
      + (b._html || '') + '</div>';
  }).join('\n');

  return '<div class=\"slide\" style=\"background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;\">'
    + titleHTML + parts + '</div>';
}

function renderGrid(blocks, titleHTML) {
  var parts = blocks.filter(function(b) { return !b._skip && b.pos; }).map(function(b) {
    var p = b.pos.pixels;
    return '<div style=\"position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;height:' + p.h + 'px;overflow:hidden;\">'
      + (b._html || '') + '</div>';
  }).join('\n');

  return '<div class=\"slide\" style=\"background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;\">'
    + titleHTML + parts + '</div>';
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
