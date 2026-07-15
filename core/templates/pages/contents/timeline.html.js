/**
 * timeline.html.js — 横向曲线时间线
 *
 * 节点沿波浪曲线排列，交替上下错落，SVG 贝塞尔连接。
 * 所有元素严格约束在 960×540 画布内。
 *
 * 内容模型：
 *   <!-- slide: timeline, title=发展历程 -->
 *   ### 2024 Q1
 *   - 项目立项
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings.find(h => h.level <= 2);
  const pageTitle = title ? title.text : (props.title || '');
  const blocks = content.blocks || [];

  const nodes = [];
  let cur = null;
  for (const block of blocks) {
    if (block.type === 'heading' && block.data.level >= 3) {
      if (cur) nodes.push(cur);
      cur = { date: block.data.text, items: [], imageSrc: '' };
    } else if (block.type === 'list' && cur) {
      for (const item of block.data.items) cur.items.push(item.text || '');
    } else if (block.type === 'paragraph' && cur) {
      cur.items.push(block.data.text || '');
    } else if ((block.type === 'image' || block.type === 'image-tag') && cur) {
      cur.imageSrc = block.data.src || '';
    }
  }
  if (cur) nodes.push(cur);

  if (nodes.length === 0) {
    return `<div class="slide" style="background:var(--color-bg);padding:50px 70px;">
      <div class="section-title">${esc(pageTitle||'时间线')}</div><div class="divider"></div>
      <p style="color:#999;">（使用 ### 标题 + 列表项创建时间节点）</p></div>`;
  }

  // ===== 画布预算：960×540 =====
  const n = nodes.length;
  const titleH = pageTitle ? 52 : 16;
  const mainY = titleH + 210;           // 波浪中心线 Y
  const nodeW = 165, nodeH = 80;        // 卡片尺寸（稍宽，文字+图左右排列）
  const startX = 80, endX = 880;        // 卡片中心X范围（留 80px 边距）
  const stepX = n > 1 ? (endX - startX) / (n - 1) : 0;
  const waveAmp = 50;                   // 波浪振幅

  // 节点锚点（曲线上连接位置）
  const points = nodes.map((_, i) => {
    const cx = n > 1 ? startX + i * stepX : 480;
    const above = i % 2 === 0;
    const py = above ? mainY - 60 : mainY + 60;
    return { x: cx, y: py, above };
  });

  // ===== SVG 波浪曲线 =====
  let pathD = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) pathD += `M${Math.max(0, p.x - 40)},${p.y} `;
    if (i < points.length - 1) {
      const next = points[i + 1];
      const midX = (p.x + next.x) / 2;
      const cpY1 = p.above ? p.y + waveAmp : p.y - waveAmp;
      const cpY2 = next.above ? next.y + waveAmp : next.y - waveAmp;
      pathD += `C${midX},${cpY1} ${midX},${cpY2} ${next.x},${next.y} `;
    }
  }
  if (points.length > 0) {
    const last = points[points.length - 1];
    pathD += `L${Math.min(960, last.x + 40)},${last.y}`;
  }

  const svgParts = [];
  svgParts.push(`<path d="${pathD}" fill="none" stroke="#c0c0cc" stroke-width="2" stroke-linecap="round"/>`);
  points.forEach(p => {
    svgParts.push(`<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--color-primary)" stroke="#fff" stroke-width="2"/>`);
  });
  // 小连接线：锚点 → 卡片
  nodes.forEach((_, i) => {
    const p = points[i];
    const cardTop = p.above ? p.y - nodeH - 10 : p.y + 10;
    const lineStartY = p.y + (p.above ? -4 : 4);
    const lineEndY = p.above ? cardTop + nodeH : cardTop;
    svgParts.push(`<line x1="${p.x}" y1="${lineStartY}" x2="${p.x}" y2="${lineEndY}" stroke="#d8d8e0" stroke-width="1"/>`);
  });
  const svgHTML = `<svg style="position:absolute;left:0;top:0;width:960px;height:540px;pointer-events:none;">${svgParts.join('')}</svg>`;

  // ===== 卡片 HTML（左右布局：文字左 + 图片右）=====
  const nodesHTML = nodes.map((node, i) => {
    const p = points[i];
    const above = p.above;
    const cardY = above ? p.y - nodeH - 10 : p.y + 10;
    let cardX = p.x - nodeW / 2;
    cardX = Math.max(2, Math.min(960 - nodeW - 2, cardX));

    const imgW = 55;
    const textW = nodeW - imgW - 2;  // 文字区宽度

    const hasImg = node.imageSrc && node.imageSrc.length > 100;
    const imgHTML = hasImg
      ? `<img src="${esc(node.imageSrc)}" style="width:${imgW}px;height:${nodeH}px;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:${imgW}px;height:${nodeH}px;display:flex;align-items:center;justify-content:center;border-left:1px dashed #e0e0e0;background:#fafafa;font-size:8px;color:#ccc;flex-shrink:0;writing-mode:vertical-rl;letter-spacing:2px;">占位</div>`;

    return `<div style="position:absolute;left:${cardX}px;top:${cardY}px;width:${nodeW}px;height:${nodeH}px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;overflow:hidden;">
      <div style="width:${textW}px;display:flex;flex-direction:column;flex-shrink:0;">
        <div style="background:var(--color-primary);height:3px;flex-shrink:0;"></div>
        <div style="padding:5px 8px 2px;flex-shrink:0;">
          <div style="font-size:11px;font-weight:700;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(node.date)}</div>
        </div>
        <div style="padding:0 8px;flex:1;overflow:hidden;">
          ${node.items.slice(0,2).map(item => `<div style="font-size:9.5px;color:#777;line-height:1.45;">${esc(item)}</div>`).join('')}
        </div>
      </div>
      ${imgHTML}
    </div>`;
  }).join('');

  return `<div class="slide slide-timeline" style="background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;">
    ${pageTitle ? `<div style="position:absolute;left:40px;top:18px;"><div class="section-title" style="font-size:20px;">${esc(pageTitle)}</div><div class="divider"></div></div>` : ''}
    ${svgHTML}
    ${nodesHTML}
  </div>`;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
module.exports = { render };
