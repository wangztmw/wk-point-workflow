/**
 * split.js — 左右分栏排列规则
 *
 * 找安全分割点，左右栏按内容权重比例分配列宽。
 * 跳过 _skip 标记的 block。
 */

var { blockHeightActual } = require('../../../layout/height');

function arrange(blocks, box) {
  var b = box || {};
  var startY = b.startY || 0.55, gap = b.gap || 0.06;

  var visible = blocks.filter(function(blk) { return !blk._skip; });
  var n = visible.length;
  if (n === 0) return;

  // 安全中点
  var mid = Math.ceil(n / 2);
  for (var tryMid = mid; tryMid > 0; tryMid--) {
    var prev = visible[tryMid - 1], cur = visible[tryMid];
    if (cur && cur.tag === 'list' && prev && (prev.tag === 'h3' || prev.tag === 'h4')) continue;
    mid = tryMid; break;
  }
  var leftBs = visible.slice(0, mid), rightBs = visible.slice(mid);

  // 加权分配
  function colWeight(bs) {
    var w = 0;
    bs.forEach(function(bk) {
      if (bk.tag === 'list') w += (bk.data && bk.data.items ? bk.data.items.length : 2);
      else if (bk.tag === 'img') w += 2;
      else if (bk.tag === 'chart') w += 4;
      else w += 1;
    });
    return w || 1;
  }
  var slideH = 5.2;
  var lW = colWeight(leftBs), rW = colWeight(rightBs);
  var availH = slideH - startY - gap * (Math.max(leftBs.length, rightBs.length) - 1);
  var unitH = availH / (lW + rW);

  // 内容驱动列宽
  var totalW = 8.8, colGap = 0.2;
  var ratio = lW / (lW + rW);
  var leftW = Math.round(totalW * ratio * 100) / 100;
  if (leftW < 3.0) leftW = 3.0;
  if (leftW > totalW - 3.0) leftW = totalW - 3.0;
  if (leftW > 6.5) leftW = 6.5;
  var rightW = Math.round((totalW - leftW - colGap) * 100) / 100;
  var leftX = 0.6, rightX = Math.round((leftX + leftW + colGap) * 100) / 100;
  var lY = startY, rY = startY;

  leftBs.forEach(function(block) {
    var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 3 : 1));
    var h = Math.max(0.3, wgt * unitH);
    block.pos = {
      inches: { x: leftX, y: lY, w: leftW, h: h },
      pixels: { x: r(leftX), y: r(lY), w: r(leftW), h: r(h) },
    };
    lY += h + gap;
  });
  rightBs.forEach(function(block) {
    var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 3 : 1));
    var h = Math.max(0.3, wgt * unitH);
    block.pos = {
      inches: { x: rightX, y: rY, w: rightW, h: h },
      pixels: { x: r(rightX), y: r(rY), w: r(rightW), h: r(h) },
    };
    rY += h + gap;
  });

  // 实际高度校验：用文本真实行数检测溢出，等比缩小
  for (var pass = 0; pass < 3; pass++) {
    var needShrink = false;
    for (var i = 0; i < visible.length; i++) {
      var blk = visible[i];
      var p = blk.pos;
      if (!p) continue;
      var actual = blockHeightActual(blk, p.inches.w);
      if (actual > p.inches.h * 1.05) { needShrink = true; break; }
    }
    if (!needShrink) break;
    for (var i = 0; i < visible.length; i++) {
      var st = visible[i].style;
      if (!st) continue;
      var fs = Number(st['font-size']);
      if (fs > 6) st['font-size'] = String(Math.max(6, Math.round(fs * 0.9)));
    }
    // 重排
    var lY2 = startY, rY2 = startY;
    leftBs.forEach(function(block) {
      var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 2 : 1));
      var h = Math.max(0.3, wgt * unitH);
      block.pos = { inches: { x: leftX, y: lY2, w: leftW, h: h }, pixels: { x: r(leftX), y: r(lY2), w: r(leftW), h: r(h) } };
      lY2 += h + gap;
    });
    rightBs.forEach(function(block) {
      var wgt = (block.tag === 'list' ? (block.data && block.data.items ? block.data.items.length : 2) : (block.tag === 'img' ? 2 : 1));
      var h = Math.max(0.3, wgt * unitH);
      block.pos = { inches: { x: rightX, y: rY2, w: rightW, h: h }, pixels: { x: r(rightX), y: r(rY2), w: r(rightW), h: r(h) } };
      rY2 += h + gap;
    });
  }
}

function r(v) { return Math.round(v * 96); }

module.exports = { arrange };
