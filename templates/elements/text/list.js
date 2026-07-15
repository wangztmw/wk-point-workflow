/**
 * list.js — 列表元素
 * render(items, ordered, style) → <ul>/<ol>
 */
const { esc } = require('../shared/escape');
const { renderInline } = require('../shared/inline');
const { styleToHtml } = require('../../../core/utils/coordinates');

function render(items, ordered, style) {
  const s = style || {};
  const fs = s['font-size'] || 12;
  const pos = styleToHtml(s);
  const pad = s.padding || '0';
  const tag = ordered ? 'ol' : 'ul';

  const itemsHTML = (items || []).map(item => {
    const text = typeof item === 'string' ? item : (item.text || '');
    const markup = typeof item === 'object' ? item.inlineMarkup : null;
    const inner = markup ? renderInline(markup, {mode: 'html'}) : esc(text);
    return `<li style="font-size:${fs}px;color:#${s.color||'444444'};line-height:1.7;">${inner}</li>`;
  }).join('');

  return `<div style="${pos};padding:${pad}px;overflow-y:auto;">
    <${tag} style="margin:0;padding-left:${ordered?24:18}px;">${itemsHTML}</${tag}>
  </div>`;
}

module.exports = { render };
