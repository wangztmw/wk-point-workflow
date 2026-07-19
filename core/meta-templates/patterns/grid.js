/**
 * grid.js — 网格排列规则
 *
 * 自适应列数（2-3列），行内等高。
 * 写入 block.pos = { inches, pixels }。
 */

const { blockHeight } = require('../../layout/height');

function arrange(blocks, box) {
  var b = box || {};
  var startY = b.startY || 0.55, gap = b.gap || 0.06;
  var items = blocks.filter(function(blk) { return !blk._skip; });
  var n = items.length;
  if (n === 0) return;
  // 自适应列数：数量越多列越多，保证卡片不会太小
  var cols = n <= 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  var totalW = b.w || 8.8;
  var cardW = (totalW - gap * (cols - 1)) / cols;
  var heights = items.map(function(bk) { return blockHeight(bk, cardW); });
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
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols && r * cols + c < n; c++) {
      var i = r * cols + c;
      var bx = (b.x || 0.6) + c * (cardW + gap);
      items[i].pos = {
        inches: { x: bx, y: y, w: cardW, h: rowHeights[r] - gap },
        pixels: { x: rx(bx), y: rx(y), w: rx(cardW), h: rx(rowHeights[r] - gap) },
      };
    }
    y += rowHeights[r];
  }
}

function rx(v) { return Math.round(v * 96); }

module.exports = { arrange };
