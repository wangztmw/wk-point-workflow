/**
 * image-text.html.js — 图文混排页（左右分栏）
 * 左侧大图 + 右侧文字，图片占55%宽度
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const imgSrc = (content.images && content.images[0]) ? content.images[0].src : '';
  const items = [];
  for (const list of content.lists) {
    for (const item of list.items) items.push(item.text || '');
  }
  const desc = content.paragraphs.map(p => p.text).join('<br>');

  return `<div class="slide slide-image-text" style="background:var(--color-bg);padding:40px 44px;display:flex;gap:28px;height:540px;box-sizing:border-box;">
  <div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--color-bg-alt);overflow:hidden;">
    ${imgSrc
      ? `<img src="${escapeHTML(imgSrc)}" style="max-width:100%;max-height:440px;object-fit:contain;" alt="">`
      : '<div style="color:#ddd;font-size:48px;">📷</div>'}
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:8px 0;">
    ${title ? `<div class="section-title" style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${escapeHTML(title)}</div><div class="divider"></div>` : ''}
    ${items.length > 0 ? `<ul class="slide-list">${items.map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>` : ''}
    ${desc ? `<p class="slide-para">${desc}</p>` : ''}
  </div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
