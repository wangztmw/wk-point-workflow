/**
 * center.js — 内容居中
 *
 * 排列完成后，计算内容实际占用的宽高，在页面内容区内水平和垂直居中。
 */

/** 将 blocks 居中到页面的内容区域内 */
function centerContent(blocks, page) {
  if (!blocks || !blocks.length) return;

  var first = null, lastX = 0, lastY = 0;
  var contentW = 0, contentH = 0;

  for (var i = 0; i < blocks.length; i++) {
    var p = blocks[i].pos;
    if (!p || !p.inches) continue;
    var right = p.inches.x + p.inches.w;
    var bottom = p.inches.y + p.inches.h;
    if (right > contentW) contentW = right;
    if (bottom > contentH) contentH = bottom;
    if (!first) { first = p; lastX = p.inches.x; lastY = p.inches.y; }
    if (p.inches.x < lastX) lastX = p.inches.x;
    if (p.inches.y < lastY) lastY = p.inches.y;
  }

  contentW = contentW - lastX;
  contentH = contentH - lastY;

  var pageW = page.contentW || 8.8;
  var pageH = page.contentH || 4.7;
  var pageX = 0.6;  // 页面左边距
  var pageTop = page.contentTop || 0.7;

  var dx = pageX + (pageW - contentW) / 2 - lastX;
  var dy = pageTop + (pageH - contentH) / 2 - lastY;

  if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return; // 已居中，跳过

  for (var i = 0; i < blocks.length; i++) {
    var p = blocks[i].pos;
    if (!p) continue;
    p.inches.x += dx;
    p.inches.y += dy;
    p.pixels.x = Math.round(p.inches.x * 96);
    p.pixels.y = Math.round(p.inches.y * 96);
  }
}

module.exports = { centerContent };
