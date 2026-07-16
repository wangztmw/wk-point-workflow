/**
 * split.js — 左右分栏布局
 * render(leftEls, rightEls, title, ratio, config) → slide HTML
 * ratio: 左栏占比，默认 0.5
 */
const pageTitle = require('../elements/text/page-title');

function render(leftEls, rightEls, title, ratio, config) {
  const r = ratio || 0.5;
  const gap = 20;
  const titleH = title ? 56 : 16;
  const startY = title ? 80 : 24;
  const availW = 920, availH = 540 - startY - 20;
  const leftW = Math.floor(availW * r - gap / 2);
  const rightW = availW - leftW - gap;

  function renderCol(els, colW, colH, startIdx) {
    let y = 0;
    return els.map((el, i) => {
      const h = Math.min((el.style && el.style.h) || 40, colH - y);
      const html = el.render({ ...(el.style || {}), x: 0, y, w: colW, h });
      y += h + 8;
      return `<div data-block="${startIdx + i}">${html}</div>`;
    }).join('');
  }

  return `<div class="slide" data-slide="${config.slideIndex||0}" style="background:var(--color-bg);padding:${startY}px 20px 20px;">
    ${title ? pageTitle.render(title) : ''}
    <div style="display:flex;gap:${gap}px;${title?'margin-top:12px;':''}height:${availH}px;">
      <div style="width:${leftW}px;position:relative;overflow:hidden;">${renderCol(leftEls||[], leftW, availH, 0)}</div>
      <div style="width:2px;background:var(--color-border);flex-shrink:0;"></div>
      <div style="width:${rightW}px;position:relative;overflow:hidden;">${renderCol(rightEls||[], rightW, availH, leftEls.length)}</div>
    </div>
  </div>`;
}

module.exports = { render };
