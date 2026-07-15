/**
 * image-full.html.js — 全屏出血图 + 文字叠加
 *
 * 资源模式：
 *   images/<标签名>/  子文件夹 → 有图用图，无图显示占位
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const sub = content.headings[1]?.text || '';
  const imgData = (content.images && content.images[0]) ? content.images[0] : { src: '', label: '' };
  const hasImage = imgData.src && imgData.src.length > 100;
  const label = imgData.label || title || '图片';
  const desc = content.paragraphs.map(p => p.text).join('');

  if (!hasImage) {
    return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="display:flex;align-items:center;justify-content:center;width:400px;height:250px;border:2px dashed #d0d0d0;background:#fafafa;">
        <div style="font-size:22px;font-weight:600;color:#999;text-align:center;">${escapeHTML(label)}</div>
      </div>
      ${title ? `<div style="font-size:18px;color:#666;margin-top:16px;">${escapeHTML(title)}</div>` : ''}
    </div>`;
  }

  return `<div class="slide slide-image-full" style="background-image:url(${escapeHTML(imgData.src)});background-size:cover;background-position:center;position:relative;display:flex;align-items:center;justify-content:center;">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.55) 100%);z-index:0;"></div>
  <div style="position:relative;z-index:1;text-align:center;color:#fff;padding:40px 60px;">
    ${title ? `<div style="font-size:36px;font-weight:800;margin-bottom:12px;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${escapeHTML(title)}</div>` : ''}
    ${sub ? `<div style="font-size:18px;font-weight:300;opacity:0.85;margin-bottom:8px;">${escapeHTML(sub)}</div>` : ''}
    ${desc ? `<div style="font-size:14px;opacity:0.7;margin-top:12px;max-width:500px;margin-left:auto;margin-right:auto;">${escapeHTML(desc)}</div>` : ''}
    <div style="width:60px;height:2px;background:rgba(255,255,255,0.5);margin:20px auto 0;"></div>
  </div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
