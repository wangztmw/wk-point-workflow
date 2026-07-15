/**
 * paragraph.js — 段落元素
 * render(text, inlineMarkup, style) → <p>，含文字自适应截断
 */
const { esc } = require('../shared/escape');
const { renderInline } = require('../shared/inline');
const { styleToHtml, maxFitLines, lineClampCSS } = require('../../../utils/coordinates');

function render(text, inlineMarkup, style) {
  const s = style || {};
  const fs = s['font-size'] || 13;
  const html = renderInline(inlineMarkup, {mode: 'html'});
  const pos = styleToHtml(s);
  const pad = s.padding || '0';
  const boxH = s.h || 60;
  const maxL = maxFitLines(boxH - pad * 2, fs, 1.6);
  const clamp = lineClampCSS(maxL);

  return `<div style="${pos};padding:${pad}px;">
    <p style="margin:0;font-size:${fs}px;color:#${s.color||'555555'};text-align:${s.align||'left'};line-height:1.6;${clamp}">${html}</p>
  </div>`;
}

module.exports = { render };
