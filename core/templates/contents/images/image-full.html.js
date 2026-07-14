/**
 * image-full.html.js — 全屏出血图 + 文字叠加
 * 图片铺满背景，深色渐变蒙版，文字居中
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const sub = content.headings[1]?.text || '';
  const imgSrc = (content.images && content.images[0]) ? content.images[0].src : '';
  const desc = content.paragraphs.map(p => p.text).join('');

  if (!imgSrc) {
    return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;">
      <div class="section-title">${escapeHTML(title)}</div><div class="divider"></div>
      <p style="color:#999;">（需要图片URL）</p></div>`;
  }

  return `<div class="slide slide-image-full" style="background-image:url(${escapeHTML(imgSrc)});background-size:cover;background-position:center;position:relative;display:flex;align-items:center;justify-content:center;">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.55) 100%);z-index:0;"></div>
  <div style="position:relative;z-index:1;text-align:center;color:#fff;padding:40px 60px;">
    ${title ? `<div style="font-size:36px;font-weight:800;margin-bottom:12px;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${escapeHTML(title)}</div>` : ''}
    ${sub ? `<div style="font-size:18px;font-weight:300;opacity:0.85;margin-bottom:8px;">${escapeHTML(sub)}</div>` : ''}
    ${desc ? `<div style="font-size:14px;opacity:0.7;margin-top:12px;max-width:500px;margin-left:auto;margin-right:auto;">${escapeHTML(desc)}</div>` : ''}
    <div style="width:60px;height:2px;background:rgba(255,255,255,0.5);margin:20px auto 0;border-radius:1px;"></div>
  </div>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
