const { renderInline } = require('../shared/inline');

function render(text, inlineMarkup, style) {
  const s = style || {};
  const fs = s['font-size'] || 13;
  const html = renderInline(inlineMarkup, {mode: 'html'});
  return `<p style="margin:0;font-size:${fs}px;color:#${s.color||'555555'};text-align:${s.align||'left'};line-height:1.6;">${html}</p>`;
}

module.exports = { render };
