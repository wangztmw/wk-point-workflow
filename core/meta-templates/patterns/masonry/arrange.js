/**
 * masonry.js — 瀑布流排列（自适应缩放）
 *
 * 根据内容实际高度和页面可用高度的比例，一次性计算精准缩放。
 */

var { blockHeight } = require('../../../layout/height');

function arrange(blocks, box) {
  var b = box || {};
  var startY = b.startY || 0.55, gap = b.gap || 0.08;
  var maxH = b.pageH || 4.7;
  var cols = 3;
  var totalW = b.w || 8.8;
  var colW = (totalW - gap * (cols - 1)) / cols;
  var startX = b.x || 0.6;

  // ① 排列 → ② 超出？→ 全局等比缩放 → ③ 重排，最多 3 轮自适应收敛
  for (var round = 0; round < 3; round++) {
    var colY = [startY, startY, startY];

    for (var i = 0; i < blocks.length; i++) {
      var c = shortest(colY);
      var h = blockHeight(blocks[i], colW);
      blocks[i].pos = {
        inches: { x: startX + c * (colW + gap), y: colY[c], w: colW, h: h },
        pixels: { x: rx(startX + c * (colW + gap)), y: rx(colY[c]), w: rx(colW), h: rx(h) },
      };
      colY[c] += h + gap;
    }

    var bottom = startY + maxH;
    var peak = Math.max(colY[0], colY[1], colY[2]);
    if (peak <= bottom) break;

    scaleAll(blocks, bottom / peak);
  }
}

function shortest(arr) { var c = 0; if (arr[1] < arr[c]) c = 1; if (arr[2] < arr[c]) c = 2; return c; }

function scaleAll(blocks, ratio) {
  if (ratio > 1.3) ratio = 1.3;
  for (var i = 0; i < blocks.length; i++) {
    var st = blocks[i].style;
    if (!st) continue;
    var fs = Number(st['font-size']);
    if (fs > 0) st['font-size'] = String(Math.max(6, Math.round(fs * ratio)));
  }
}

function rx(v) { return Math.round(v * 96); }

module.exports = { arrange };
