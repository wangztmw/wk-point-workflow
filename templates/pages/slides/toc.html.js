const { esc } = require('../../elements/shared/escape');
/**
 * toc.html.js — 目录页
 * h2 = 章节标题，h3 = 子章节，自动编号
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '目录';
  const items = content.headings.filter(h => h.level >= 2).map((h, i) => ({
    num: i + 1, text: h.text, level: h.level,
  }));

  const listHTML = items.map(item =>
    `<div class="toc-item" style="display:flex;align-items:baseline;padding:10px 0;font-size:${item.level === 2 ? 22 : 17}px;color:${item.level === 2 ? '#333' : '#555'};margin-left:${(item.level-2)*30}px;">
      <span class="toc-num" style="color:var(--color-primary);font-weight:700;min-width:40px;">${String(item.num).padStart(2,'0')}</span>
      <span>${esc(item.text)}</span>
    </div>`
  ).join('');

  return `<div class="slide slide-toc" style="background:var(--color-bg);padding:44px 60px;">
  <div class="section-title" style="font-size:30px;">${esc(title)}</div>
  <div class="divider"></div>
  <div style="margin-top:16px;">${listHTML}</div>
</div>`;
}

module.exports = { render };
