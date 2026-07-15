/**
 * box.js — 装饰矩形元素
 * render(style) → <div>
 */
const { styleToHtml } = require('../../../core/utils/coordinates');

function render(style) {
  const s = style || {};
  const pos = styleToHtml(s);
  const fill = s['fill-color'] ? `background:#${s['fill-color']};` : '';
  const bd = s['border-color'] ? `border:${s['border-width']||1}px solid #${s['border-color']};` : '';
  const br = s['border-radius'] ? `border-radius:${s['border-radius']}px;` : '';
  return `<div style="${pos};${fill}${bd}${br}"></div>`;
}

module.exports = { render };
