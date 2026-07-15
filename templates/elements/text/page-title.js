/**
 * page-title.js — 页面标题 + 分割线
 * 10+ 模板中相同的 .section-title + .divider 模式
 */
const { esc } = require('../shared/escape');

function render(title) {
  if (!title) return '';
  return `<div class="section-title" style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">${esc(title)}</div>
    <div class="divider"></div>`;
}

module.exports = { render };
