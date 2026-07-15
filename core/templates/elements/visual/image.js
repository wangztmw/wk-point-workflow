/**
 * image.js — 单图元素（含占位框）
 * render(src, label, style) → <img> 或虚线占位框
 */
const { esc } = require('../shared/escape');
const { styleToHtml } = require('../../../utils/coordinates');

function render(src, label, style) {
  const s = style || {};
  const pos = styleToHtml(s);
  const hasImage = src && src.length > 100;

  if (hasImage) {
    const fit = s['object-fit'] || 'contain';
    return `<div style="${pos};display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <img src="${esc(src)}" style="max-width:100%;max-height:100%;object-fit:${fit};" alt="${esc(label||'')}">
    </div>`;
  }

  return `<div style="${pos};display:flex;align-items:center;justify-content:center;border:2px dashed #ddd;background:#fafafa;">
    <div style="font-weight:600;color:#999;text-align:center;font-size:14px;">${esc(label||'')}</div>
  </div>`;
}

module.exports = { render };
