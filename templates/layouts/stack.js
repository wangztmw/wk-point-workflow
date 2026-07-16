/**
 * stack.js — 垂直堆叠布局
 * 元素从上到下依次排列，自动计算间距。
 *
 * render(elements, title, config) → slide HTML
 * elements: [{render: fn, style: {}}]
 */
const pageTitle = require('../elements/text/page-title');
const { esc } = require('../elements/shared/escape');

function render(elements, title, config) {
  const gap = 12;
  const startY = title ? 70 : 30;
  let y = startY;

  const parts = elements.map((el, i) => {
    const h = (el.style && el.style.h) || 40;
    const elStyle = { ...(el.style || {}), x: el.style?.x || 40, y, w: el.style?.w || 880, h };
    const html = el.render(elStyle);
    y += h + gap;
    return `<div data-block="${i}">${html}</div>`;
  }).join('\n');

  return `<div class="slide" data-slide="${config.slideIndex||0}" style="background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;">
    ${title ? `<div style="position:absolute;left:40px;top:20px;">${pageTitle.render(title)}</div>` : ''}
    ${parts}
  </div>`;
}

module.exports = { render };
