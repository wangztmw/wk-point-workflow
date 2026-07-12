/**
 * image-text.html.js — 图文混排页
 * ![](url) 的图片 + 文字说明，左右排列
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

  return `<div class="slide slide-image-text" style="background:var(--color-bg);padding:40px 44px;display:flex;gap:28px;">
  <div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--color-bg-alt);border-radius:12px;overflow:hidden;">
    ${imgSrc ? `<img src="${escapeHTML(imgSrc)}" style="max-width:100%;max-height:420px;object-fit:contain;" alt="">` : '<div style="color:#ccc;font-size:40px;">📷</div>'}
  </div>
  <div style="flex:1;">
    ${title ? `<div class="section-title">${escapeHTML(title)}</div><div class="divider"></div>` : ''}
    ${items.length > 0 ? `<ul class="slide-list">${items.map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>` : ''}
    ${desc ? `<p class="slide-para">${desc}</p>` : ''}
  </div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
