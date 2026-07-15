/**
 * image-grid.html.js — 文件夹驱动图片矩阵
 *
 * 资源模式：
 *   images/<标签名>/  子文件夹 → 有图用图，无图显示占位框
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const images = content.images || [];

  const n = images.length;
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  const gridHTML = images.map((img, i) => {
    const label = img.label || '';
    const hasImage = img.src && img.src.length > 100;

    if (hasImage) {
      return `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:100%;height:170px;background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${escapeHTML(img.src)}" style="max-width:100%;max-height:170px;object-fit:contain;" alt="${escapeHTML(label)}">
        </div>
        ${label ? `<div style="font-size:12px;color:#666;margin-top:6px;text-align:center;">${escapeHTML(label)}</div>` : ''}
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:100%;height:170px;display:flex;align-items:center;justify-content:center;border:2px dashed #d0d0d0;background:#fafafa;">
        <div style="font-size:13px;font-weight:600;color:#999;text-align:center;max-width:90%;">${escapeHTML(label)}</div>
      </div>
      ${label ? `<div style="font-size:12px;color:#999;margin-top:6px;text-align:center;">${escapeHTML(label)}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="slide slide-image-grid" style="background:var(--color-bg);padding:36px 44px;">
  ${title ? `<div class="section-title" style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${escapeHTML(title)}</div><div class="divider"></div>` : ''}
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;margin-top:12px;flex:1;">${gridHTML}</div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
