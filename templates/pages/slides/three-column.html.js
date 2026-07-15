const { esc } = require('../../elements/shared/escape');
/**
 * three-column.html.js — 三栏卡片布局
 * h3 标题 → 3张卡片，每张含编号圆圈 + 标题 + 列表
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const h3s = content.headings.filter(h => h.level >= 3);

  // 收集列表项，均分到3栏
  const allItems = [];
  for (const list of content.lists) {
    for (const item of list.items) allItems.push(item.text || '');
  }
  const perCol = Math.ceil(allItems.length / 3);
  const cols = [];
  for (let i = 0; i < 3; i++) {
    cols.push({
      title: h3s[i]?.text || '栏目 ' + (i+1),
      items: allItems.slice(i * perCol, (i+1) * perCol),
    });
  }

  const colors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-success)'];
  const cardsHTML = cols.map((col, i) => `
    <div style="flex:1;background:var(--color-bg-alt);padding:24px 20px;display:flex;flex-direction:column;">
      <div style="width:36px;height:36px;border-radius:50%;background:${colors[i]};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;margin-bottom:14px;">${i+1}</div>
      <h4 style="font-size:17px;font-weight:700;color:#333;margin-bottom:10px;">${esc(col.title)}</h4>
      ${col.items.length > 0 ? `<ul style="list-style:none;">${col.items.map(item => `<li style="font-size:13px;color:#555;line-height:1.8;padding-left:0;">${esc(item)}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('<div style="width:1px;background:#e0e0e0;flex-shrink:0;"></div>');

  return `<div class="slide slide-three-col" style="background:var(--color-bg);padding:40px 44px;">
  ${title ? `<div class="section-title" style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${esc(title)}</div><div class="divider"></div>` : ''}
  <div style="display:flex;gap:0;margin-top:20px;flex:1;min-height:0;">${cardsHTML}</div>
</div>`;
}

module.exports = { render };
