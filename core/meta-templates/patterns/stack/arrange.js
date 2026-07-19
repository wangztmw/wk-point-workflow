/**
 * stack.js — 垂直堆叠排列规则
 *
 * 内容感知：总高度超出页面时自动缩小字号。
 * 跳过 _skip 标记的 block。
 */

const { blockHeight } = require('../../../layout/height');

function arrange(blocks, box) {
  var b = box || {};
  var x = b.x || 0.6, startY = b.startY || 0.3, w = b.w || 8.8, gap = b.gap || 0.06;
  var pageH = b.pageH || 4.7;  // 内容可用高度

  var items = blocks.filter(function(blk) { return !blk._skip; });
  if (items.length === 0) return;

  // 第一遍：计算总高度
  var totalH = gap;
  for (var i = 0; i < items.length; i++) {
    totalH += blockHeight(items[i], w) + gap;
  }

  // 自适应：溢出必缩，不足适度放大（目标 85% 填充，上限 1.3×）
  var target = pageH * 0.85;
  var scale = target / totalH;
  if (scale > 1.3) scale = 1.3;  // 不放太大，避免表格换行
  if (scale < 0.5) scale = 0.5;
  if (scale < 0.95 || scale > 1.05) {
    for (var i = 0; i < items.length; i++) {
      var st = items[i].style;
      if (!st) continue;
      var fs = Number(st['font-size']);
      if (fs > 0) st['font-size'] = String(Math.max(8, Math.round(fs * scale)));
    }
    // 图片也等比缩放
    for (var i = 0; i < items.length; i++) {
      if (items[i].tag === 'img' && items[i].pos) {
        items[i].pos.inches.h *= scale;
        items[i].pos.inches.w *= scale;
        items[i].pos.pixels.h = Math.round(items[i].pos.inches.h * 96);
        items[i].pos.pixels.w = Math.round(items[i].pos.inches.w * 96);
      }
    }
  }

  // 第二遍：实际排列
  var y = startY;
  for (var i = 0; i < items.length; i++) {
    var h = blockHeight(items[i], w);
    items[i].pos = {
      inches: { x: x, y: y, w: w, h: h },
      pixels: { x: r(x), y: r(y), w: r(w), h: r(h) },
    };
    y += h + gap;
  }
}

function r(v) { return Math.round(v * 96); }

module.exports = { arrange };
