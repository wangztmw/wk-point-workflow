/**
 * layout-engine.js — 布局算法纯函数（HTML + PPT 共用）
 *
 * 所有函数输入 block 数据和容器参数，输出位置或高度。
 * 不依赖 Node.js 或浏览器 API，纯数据计算。
 * 单位：英寸（PptxGenJS 坐标系）。
 */

// ============================================================
// 高度计算
// ============================================================

/** 单行文本需要的行数 */
function textLines(text, colW, fs) {
  if (!text || !colW || !fs) return 1;
  var cpl = Math.floor(colW * 96 / (fs * 1.0));  // 中文字宽 ≈ 字号
  if (cpl < 1) cpl = 1;
  return Math.ceil(String(text).length / cpl);
}

/** 单个列表项高度 */
function itemHeight(text, colW, fs) {
  var lines = textLines(text, colW, fs || 12);
  return Math.max(0.28, lines * (fs || 12) / 96 * 2.0 + 0.04);
}

/** block 的自然高度 */
function blockHeight(block, colW) {
  var tag = block.tag;
  var st = block.style || {};
  var fs = Number(st['font-size']);
  var w = colW || 8.8;

  if (tag === 'h1')       return (fs || 32) / 96 * 1.6 + 0.06;
  if (tag === 'h2')       return (fs || 24) / 96 * 1.6 + 0.06;
  if (tag === 'h3' || tag === 'h4') return (fs || 16) / 96 * 1.6 + 0.06;
  if (tag === 'p') {
    var text = (block.data && block.data.text) || '';
    if (!text) return 0.35;
    var lines = textLines(text, w, fs || 13);
    return Math.max(0.45, lines * (fs || 13) / 96 * 2.0 + 0.12);
  }
  if (tag === 'list') {
    var items = (block.data && block.data.items) || [];
    if (!items.length) return 0.35;
    var total = 0;
    items.forEach(function(item) {
      var t = typeof item === 'string' ? item : (item.text || '');
      total += itemHeight(t, w, fs || 12);
    });
    return Math.max(0.40, total + 0.08);
  }
  if (tag === 'img')      return 1.4;
  if (tag === 'table')    return ((block.data && block.data.rows) ? block.data.rows.length + 1 : 3) * 0.26;
  if (tag === 'chart')    return 3.6;
  if (tag === 'box')      return (Number(st.h) || 4) / 96;
  return 0.4;
}

// ============================================================
// 位置计算
// ============================================================

/** 垂直堆叠：每个元素按自然高度从上到下排列 */
function stackPositions(blocks, box) {
  var b = box || {};
  var x = b.x || 0.6, y = b.startY || 0.3, w = b.w || 8.8, gap = b.gap || 0.06;
  return blocks.map(function(block) {
    var h = blockHeight(block, w);
    var pos = { x: x, y: y, w: w, h: h };
    y += h + gap;
    return pos;
  });
}

/** 左右分栏：先找中点（不拆 H3+list 对），两栏独立加权堆叠 */
function splitPositions(blocks, box) {
  var b = box || {};
  var startY = b.startY || 0.55, gap = b.gap || 0.06;
  var n = blocks.length;
  var mid = Math.ceil(n / 2);
  for (var tryMid = mid; tryMid > 0; tryMid--) {
    var prev = blocks[tryMid - 1], cur = blocks[tryMid];
    if (cur && cur.tag === 'list' && prev && (prev.tag === 'h3' || prev.tag === 'h4')) continue;
    mid = tryMid; break;
  }
  var leftBs = blocks.slice(0, mid), rightBs = blocks.slice(mid);
  // 加权分配
  function colWeight(bs) {
    var w = 0;
    bs.forEach(function(bk) {
      if (bk.tag === 'list') w += (bk.data && bk.data.items ? bk.data.items.length : 2);
      else if (bk.tag === 'img') w += 3;
      else if (bk.tag === 'chart') w += 5;
      else w += 1;
    });
    return w || 1;
  }
  var slideH = 5.2;
  var lW = colWeight(leftBs), rW = colWeight(rightBs);
  var maxCount = Math.max(leftBs.length, rightBs.length);
  var availH = slideH - startY - gap * (maxCount - 1);
  var unitH = availH / (lW + rW);
  var result = [];
  var lY = startY, rY = startY;
  leftBs.forEach(function(block) {
    var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 3 : 1));
    var h = Math.max(0.3, wgt * unitH);
    result.push({ x: 0.6, y: lY, w: 4.2, h: h });
    lY += h + gap;
  });
  rightBs.forEach(function(block) {
    var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 3 : 1));
    var h = Math.max(0.3, wgt * unitH);
    result.push({ x: 5.1, y: rY, w: 4.2, h: h });
    rY += h + gap;
  });
  return result;
}

/** 网格：自适应列数，行内等高 */
function gridPositions(blocks, box) {
  var b = box || {};
  var startY = b.startY || 0.55, gap = b.gap || 0.06;
  var n = blocks.length;
  var cols = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  var totalW = b.w || 8.8;
  var cardW = (totalW - gap * (cols - 1)) / cols;
  var heights = blocks.map(function(bk) { return blockHeight(bk, cardW); });
  var rows = Math.ceil(n / cols);
  var rowHeights = [];
  for (var r = 0; r < rows; r++) {
    var maxH = 0.4;
    for (var c = 0; c < cols && r * cols + c < n; c++) {
      maxH = Math.max(maxH, heights[r * cols + c]);
    }
    rowHeights.push(maxH + gap);
  }
  var y = startY;
  var result = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols && r * cols + c < n; c++) {
      var i = r * cols + c;
      result.push({ x: (b.x || 0.6) + c * (cardW + gap), y: y, w: cardW, h: rowHeights[r] - gap });
    }
    y += rowHeights[r];
  }
  return result;
}

// ============================================================
// 文字自适应工具
// ============================================================

function fitChars(boxW, boxH, fs, lh) {
  var cpl = Math.floor((boxW || 8.5) * 96 / (fs || 13) / 0.7);
  var maxLines = Math.max(1, Math.floor((boxH || 0.4) * 96 / ((fs || 13) * (lh || 1.6))));
  return { cpl: cpl, maxLines: maxLines, total: cpl * maxLines };
}

function truncText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).replace(/\s+$/, '') + '…';
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  blockHeight, itemHeight, textLines,
  stackPositions, splitPositions, gridPositions,
  fitChars, truncText,
};
