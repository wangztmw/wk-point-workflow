/**
 * split.js — 左右分栏排列规则
 *
 * 找安全分割点，左右栏按内容权重比例分配列宽。
 * 跳过 _skip 标记的 block。
 */

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

  // 内容驱动列宽
  var totalW = 8.8, colGap = 0.2;
  var ratio = lW / (lW + rW);
  var leftW = Math.round(totalW * ratio * 100) / 100;
  if (leftW < 2.0) leftW = 2.0;
  if (leftW > totalW - 2.0) leftW = totalW - 2.0;
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
}

function r(v) { return Math.round(v * 96); }

module.exports = { arrange };
