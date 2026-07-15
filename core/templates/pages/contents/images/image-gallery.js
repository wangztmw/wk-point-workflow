/**
 * image-gallery.js — 文件夹驱动图片排版
 *
 * 资源模式：
 *   images/<标签名>/  子文件夹 → 有图用图，无图显示占位框
 *   标签名 = content.md 中的 H3 标题
 *
 * 自动根据图片数量计算最优网格，等比缩放不拉伸
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const images = content.images || [];

  if (images.length === 0) {
    return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;">
      <div class="section-title">${escapeHTML(title || '图片集')}</div><div class="divider"></div>
      <p style="color:#999;">（需要指定图片标签 — 在 images/ 下创建对应子文件夹）</p></div>`;
  }

  const n = images.length;
  let cols = 1;
  if (n === 2) cols = 2;
  else if (n === 3) cols = 3;
  else if (n === 4) cols = 2;
  else if (n <= 6) cols = 3;
  else if (n <= 9) cols = 3;
  else cols = 4;

  const titleH = title ? 60 : 20;
  const availW = 870, availH = 480 - titleH;
  const gap = n <= 4 ? 16 : 12;
  const rows = Math.ceil(n / cols);
  const cellW = (availW - gap * (cols - 1)) / cols;
  const cellH = (availH - gap * (rows - 1)) / rows;

  const gridHTML = images.map((img, i) => {
    const label = img.label || '';
    const hasImage = img.src && img.src.length > 100;
    const imgH = cellH - (label ? 22 : 0);

    if (hasImage) {
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="width:${cellW}px;height:${imgH}px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${escapeHTML(img.src)}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${escapeHTML(label)}">
        </div>
        ${label ? `<div style="font-size:11px;color:#666;margin-top:4px;text-align:center;max-width:${cellW}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(label)}</div>` : ''}
      </div>`;
    }

    // 占位框：虚线边框 + 标签文本
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:${cellW}px;height:${imgH}px;display:flex;align-items:center;justify-content:center;border:2px dashed #d0d0d0;background:#fafafa;">
        <div style="font-size:13px;font-weight:600;color:#999;text-align:center;max-width:${cellW - 20}px;line-height:1.3;">${escapeHTML(label)}</div>
      </div>
      ${label ? `<div style="font-size:11px;color:#999;margin-top:4px;text-align:center;max-width:${cellW}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(label)}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="slide slide-image-gallery" style="background:var(--color-bg);padding:${title ? '36px' : '24px'} 44px;">
  ${title ? `<div class="section-title" style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:12px;">${escapeHTML(title)}</div><div class="divider"></div>` : ''}
  <div style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:${gap}px;justify-content:center;margin-top:${title ? '12px' : '0'};">
    ${gridHTML}
  </div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
