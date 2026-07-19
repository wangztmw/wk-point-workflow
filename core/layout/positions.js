/**
 * positions.js — stack / split / grid 位置计算（英寸）
 */

const { blockHeight } = require('./height');

/** 垂直堆叠 */
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

/** 左右分栏 */
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
  var availH = slideH - startY - gap * (Math.max(leftBs.length, rightBs.length) - 1);
  var unitH = availH / (lW + rW);
  var result = [], lY = startY, rY = startY;

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

/** 网格 */
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

module.exports = { stackPositions, splitPositions, gridPositions };
