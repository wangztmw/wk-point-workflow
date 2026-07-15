/**
 * _positions.js — 布局位置计算（HTML + PPT 共用）
 *
 * 输入 AST blocks → 输出带 x/y/w/h 的 blocks。
 * 投影层和 HTML 模板使用同一份计算，确保 PPT 导出和 HTML 渲染一致。
 */

/** 估算文本行数 */
function estLines(text, boxW, fontSize) {
  if (!text || !boxW || !fontSize) return 1;
  const cpl = Math.max(1, Math.floor(boxW / (fontSize * 0.7)));
  const clean = String(text).replace(/\*\*/g, '').replace(/\*/g, '');
  return Math.ceil(clean.length / cpl);
}

/** 单个 block 的自然高度（像素） */
function blockH(b, boxW = 840) {
  const tag = b.tag, s = b.style || {};
  if (tag === 'h1')       return Math.max(36, (Number(s['font-size']) || 32) * 1.5);
  if (tag === 'h2')       return Math.max(30, (Number(s['font-size']) || 24) * 1.5);
  if (tag === 'h3' || tag === 'h4') return Math.max(24, (Number(s['font-size']) || 16) * 1.5);
  if (tag === 'p') {
    const fs = Number(s['font-size']) || 13;
    return Math.max(28, estLines(b.data?.text || '', boxW - 20, fs) * fs * 1.7 + 8);
  }
  if (tag === 'list') {
    const fs = Number(s['font-size']) || 12;
    const items = b.data?.items || [];
    let h = 0;
    for (const item of items) {
      const t = typeof item === 'string' ? item : (item.text || '');
      h += Math.max(20, estLines(t, boxW - 30, fs) * fs * 1.7 + 2);
    }
    return Math.max(items.length * 20, h + 6);
  }
  if (tag === 'img')      return 120;
  if (tag === 'table')    return Math.max(((b.data?.rows || []).length + 1) * 22, 80);
  if (tag === 'chart')    return 320;
  if (tag === 'box')      return Number(s.h) || 4;
  return 40;
}

/** stack 布局：从上到下堆叠 */
function stackPositions(blocks, startY = 60, gap = 8) {
  let y = startY;
  return blocks.map(b => {
    const h = blockH(b, 840);
    const pos = { ...(b.style || {}), x: 60, y, w: 840, h };
    y += h + gap;
    return { ...b, style: pos };
  });
}

/** split 布局：不拆 H3+list 对，中点切左右 */
function splitPositions(blocks, startY = 60, gap = 8) {
  const n = blocks.length;
  let mid = Math.ceil(n / 2);
  for (let tryMid = mid; tryMid > 0; tryMid--) {
    const prev = blocks[tryMid - 1], cur = blocks[tryMid];
    if (cur && cur.tag === 'list' && prev && (prev.tag === 'h3' || prev.tag === 'h4')) continue;
    mid = tryMid; break;
  }
  let lY = startY, rY = startY;
  return blocks.map((b, i) => {
    const isLeft = i < mid;
    const h = blockH(b, 400);
    const pos = { ...(b.style || {}), x: isLeft ? 50 : 500, y: isLeft ? lY : rY, w: 420, h };
    if (isLeft) lY += h + gap; else rY += h + gap;
    return { ...b, style: pos };
  });
}

/** grid 布局：自适应列 */
function gridPositions(blocks, startY = 60, gap = 12) {
  const n = blocks.length;
  const cols = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  const cardW = 850 / cols;
  const heights = blocks.map(b => blockH(b, cardW - 20));
  const rows = Math.ceil(n / cols);
  const rowHeights = [];
  for (let r = 0; r < rows; r++) {
    let maxH = 80;
    for (let c = 0; c < cols && r * cols + c < n; c++) {
      maxH = Math.max(maxH, heights[r * cols + c]);
    }
    rowHeights.push(maxH + gap);
  }
  let y = startY;
  const result = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols && r * cols + c < n; c++) {
      const i = r * cols + c;
      result.push({ ...blocks[i], style: { ...(blocks[i].style || {}), x: 50 + c * (cardW + 15), y, w: cardW, h: rowHeights[r] - gap } });
    }
    y += rowHeights[r];
  }
  return result;
}

module.exports = { stackPositions, splitPositions, gridPositions };
