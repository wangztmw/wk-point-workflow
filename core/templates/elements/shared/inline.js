/**
 * inline.js — 行内标记渲染
 * 统一 content.html.js / summary.html.js / tag-renderer.js 三套实现。
 *
 * renderInline(nodes, {mode: 'html'|'plain'}) → string
 *   mode='html'  → <strong>/<em>/<code> 标签
 *   mode='plain' → 纯文本（去掉标记符）
 */
const { esc } = require('./escape');

function renderInline(nodes, opts) {
  const mode = (opts && opts.mode) || 'html';
  if (!nodes || !Array.isArray(nodes)) return '';

  return nodes.map(n => {
    if (n.type === 'text') {
      return mode === 'html' ? esc(n.value) : (n.value || '');
    }
    if (n.type === 'bold') {
      const inner = (n.content || []).map(c => c.value || '').join('');
      return mode === 'html' ? `<strong>${esc(inner)}</strong>` : inner;
    }
    if (n.type === 'italic') {
      const inner = (n.content || []).map(c => c.value || '').join('');
      return mode === 'html' ? `<em>${esc(inner)}</em>` : inner;
    }
    if (n.type === 'code') {
      const v = n.value || '';
      return mode === 'html'
        ? `<code style="background:#f0f0f0;padding:1px 5px;border-radius:0;font-family:monospace;font-size:0.9em;">${esc(v)}</code>`
        : v;
    }
    return '';
  }).join('');
}

module.exports = { renderInline };
