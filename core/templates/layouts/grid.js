/**
 * grid.js — 网格布局
 * 元素按 CSS Grid 排列，自适应列数。
 *
 * render(elements, cols, title, config) → slide HTML
 */
const pageTitle = require('../elements/text/page-title');

function render(elements, cols, title, config) {
  const n = (elements || []).length;
  const c = cols || (n <= 2 ? 2 : (n <= 4 ? 2 : 3));
  const gap = 14;
  const titleH = title ? 56 : 16;
  const startY = title ? 80 : 24;
  const availW = 880, availH = 540 - startY - 20;
  const cardW = (availW - gap * (c - 1)) / c;
  const cardH = (availH - gap * (Math.ceil(n / c) - 1)) / Math.ceil(n / c);

  const cardsHTML = elements.map(el => {
    const elStyle = { ...(el.style || {}), w: cardW, h: cardH };
    return `<div style="width:${cardW}px;height:${cardH}px;overflow:hidden;">${el.render(elStyle)}</div>`;
  }).join('');

  return `<div class="slide" style="background:var(--color-bg);padding:${startY}px 40px 20px;">
    ${title ? pageTitle.render(title) : ''}
    <div style="display:grid;grid-template-columns:repeat(${c},${cardW}px);gap:${gap}px;justify-content:center;${title?'margin-top:12px;':''}">
      ${cardsHTML}
    </div>
  </div>`;
}

module.exports = { render };
