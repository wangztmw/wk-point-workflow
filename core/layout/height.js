/**
 * height.js — block 高度估算（英寸）
 */

/** 单行文本需要的行数 */
function textLines(text, colW, fs) {
  if (!text || !colW || !fs) return 1;
  var cpl = Math.floor(colW * 96 / (fs * 1.0));
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

module.exports = { textLines, itemHeight, blockHeight };
