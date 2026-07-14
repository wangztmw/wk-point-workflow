/**
 * image-grid.html.js — 图片矩阵页
 * 2×2 或 2×3 网格，每个图片下方有简短标题
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const images = content.images || [];
  const headings = content.headings.filter(h => h.level >= 3);

  const n = images.length;
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  const gridHTML = images.map((img, i) => {
    const label = headings[i]?.text || '';
    return `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:100%;height:170px;background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${img.src ? `<img src="${escapeHTML(img.src)}" style="max-width:100%;max-height:170px;object-fit:contain;" alt="">` : `<div style="color:#ddd;font-size:32px;">📷</div>`}
      </div>
      ${label ? `<div style="font-size:12px;color:#666;margin-top:6px;text-align:center;">${escapeHTML(label)}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="slide slide-image-grid" style="background:var(--color-bg);padding:36px 44px;">
  ${title ? `<div class="section-title" style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${escapeHTML(title)}</div><div class="divider"></div>` : ''}
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;margin-top:12px;flex:1;">${gridHTML}</div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
