/**
 * timeline-node.js — 时间线节点卡片
 * render(date, items, imageSrc, nodeW, nodeH) → 卡片 HTML
 */
const { esc } = require('../shared/escape');

function render(date, items, imageSrc, nodeW, nodeH) {
  const w = nodeW || 140;
  const h = nodeH || 80;
  const imgW = 50;
  const textW = w - imgW - 2;

  const hasImg = imageSrc && imageSrc.length > 100;
  const imgHTML = hasImg
    ? `<img src="${esc(imageSrc)}" style="width:${imgW}px;height:${h}px;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:${imgW}px;height:${h}px;display:flex;align-items:center;justify-content:center;border-left:1px dashed #e0e0e0;background:#fafafa;font-size:8px;color:#ccc;flex-shrink:0;writing-mode:vertical-rl;letter-spacing:2px;">占位</div>`;

  return `<div style="width:${w}px;height:${h}px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;overflow:hidden;">
    <div style="width:${textW}px;display:flex;flex-direction:column;flex-shrink:0;">
      <div style="background:var(--color-primary);height:3px;flex-shrink:0;"></div>
      <div style="padding:5px 8px 2px;flex-shrink:0;">
        <div style="font-size:11px;font-weight:700;color:#1a1a1a;">${esc(date)}</div>
      </div>
      <div style="padding:0 8px;flex:1;overflow:hidden;">
        ${(items||[]).slice(0,2).map(it => `<div style="font-size:9.5px;color:#777;line-height:1.45;">${esc(it)}</div>`).join('')}
      </div>
    </div>
    ${imgHTML}
  </div>`;
}

module.exports = { render };
