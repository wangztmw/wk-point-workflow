const { esc } = require('../../../elements/shared/escape');
/**
 * image-text.html.js — 图文混排页（左右分栏）
 *
 * 资源模式：
 *   images/<标签名>/  子文件夹 → 有图用图，无图显示占位框
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const imgData = (content.images && content.images[0]) ? content.images[0] : { src: '', label: '' };
  const hasImage = imgData.src && imgData.src.length > 100;
  const label = imgData.label || title || '图片';

  const items = [];
  for (const list of content.lists) {
    for (const item of list.items) items.push(item.text || '');
  }
  const desc = content.paragraphs.map(p => p.text).join('<br>');

  const imageHTML = hasImage
    ? `<img src="${esc(imgData.src)}" style="max-width:100%;max-height:440px;object-fit:contain;" alt="${esc(label)}">`
    : `<div style="display:flex;align-items:center;justify-content:center;width:80%;height:60%;border:2px dashed #d0d0d0;background:#fafafa;">
        <div style="font-size:16px;font-weight:600;color:#999;text-align:center;">${esc(label)}</div>
      </div>`;

  return `<div class="slide slide-image-text" style="background:var(--color-bg);padding:40px 44px;display:flex;gap:28px;height:540px;box-sizing:border-box;">
  <div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--color-bg-alt);overflow:hidden;">
    ${imageHTML}
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:8px 0;">
    ${title ? `<div class="section-title" style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${esc(title)}</div><div class="divider"></div>` : ''}
    ${items.length > 0 ? `<ul class="slide-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
    ${desc ? `<p class="slide-para">${desc}</p>` : ''}
  </div>
</div>`;
}

module.exports = { render };
