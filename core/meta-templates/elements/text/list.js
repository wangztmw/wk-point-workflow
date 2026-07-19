const { esc } = require('../shared/escape');
const { renderInline } = require('../shared/inline');

function render(items, ordered, style) {
  const s = style || {};
  const fs = s['font-size'] || 12;
  const tag = ordered ? 'ol' : 'ul';

  const itemsHTML = (items || []).map(item => {
    const text = typeof item === 'string' ? item : (item.text || '');
    const markup = typeof item === 'object' ? item.inlineMarkup : null;
    const inner = markup ? renderInline(markup, {mode: 'html'}) : esc(text);
    return `<li style="font-size:${fs}px;color:#${s.color||'444444'};line-height:1.7;">${inner}</li>`;
  }).join('');

  return `<${tag} style="margin:0;padding-left:${ordered?24:18}px;">${itemsHTML}</${tag}>`;
}

module.exports = { render };
