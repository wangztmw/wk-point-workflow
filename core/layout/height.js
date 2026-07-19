/**
 * height.js — block 高度估算（英寸）
 */

/** 判断是否宽字符（CJK + 全角 + 中文标点） */
function isWide(c) {
  return (c >= 0x4E00 && c <= 0x9FFF) ||   // CJK 统一汉字
         (c >= 0x3400 && c <= 0x4DBF) ||   // CJK 扩展 A
         (c >= 0xF900 && c <= 0xFAFF) ||   // CJK 兼容汉字
         (c >= 0x3000 && c <= 0x303F) ||   // CJK 标点
         (c >= 0xFF00 && c <= 0xFFEF) ||   // 全角字符
         (c >= 0x2000 && c <= 0x206F) ||   // 通用标点
         (c >= 0x2E80 && c <= 0x2FFF) ||   // 部首补充
         (c >= 0xFE30 && c <= 0xFE4F) ||   // 中文竖排标点
         (c >= 0x00A0 && c <= 0x00BF) ||   // 拉丁标点（¡¿等视为半宽）
         false;
}

/** 动态计算文本宽度：宽字符 ≈ 1.0×字号，窄字符 ≈ 0.55×字号 */
function textWidth(text, fs) {
  var w = 0;
  for (var i = 0; i < text.length; i++) {
    w += fs * (isWide(text.charCodeAt(i)) ? 1.0 : 0.55);
  }
  return w;
}

/** 单行文本需要的行数 */
function textLines(text, colW, fs) {
  if (!text || !colW || !fs) return 1;
  var pxW = colW * 96;  // 列宽转像素
  var charW = textWidth(text, fs);
  return Math.max(1, Math.ceil(charW / pxW));
}

/** 单个列表项高度 */
function itemHeight(text, colW, fs) {
  var lines = textLines(text, colW, fs || 12);
  return Math.max(0.28, lines * (fs || 12) / 96 * 1.8 + 0.06);
}

// PPT 行高比 HTML 略大（PptxGenJS 默认行高约 1.5x vs CSS line-height 1.6）
var LINE_H = 2.0;   // 统一行高倍数（HTML 用 overflow:hidden 兜底，PPT 需要更保守的估算）

/** block 的自然高度（英寸） */
function blockHeight(block, colW) {
  var tag = block.tag;
  var st = block.style || {};
  var fs = Number(st['font-size']);
  var w = colW || 8.8;

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
    var hText = (block.data && block.data.text) || '';
    if (!hText) return (fs || 16) / 96 * LINE_H + 0.06;
    var hLines = textLines(hText, w, fs || 16);
    return Math.max((fs || 16) / 96 * LINE_H, hLines * (fs || 16) / 96 * LINE_H) + 0.06;
  }
  if (tag === 'p') {
    var text = (block.data && block.data.text) || '';
    if (!text) return 0.35;
    var lines = textLines(text, w, fs || 13);
    return Math.max(0.45, lines * (fs || 13) / 96 * LINE_H + 0.10);
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
  if (tag === 'img') {
    var src = (block.data && block.data.src) || '';
    return src.length > 100 ? Math.min(colW * 0.75, 3.0) : 0.8;  // 有图: 按列宽 4:3 比例，无图占位: 0.8"
  }
  if (tag === 'table')    return ((block.data && block.data.rows) ? block.data.rows.length + 1 : 3) * 0.28;
  if (tag === 'chart')    return 3.6;
  if (tag === 'box')      return (Number(st.h) || 4) / 96;
  return 0.4;
}

/** 用文本实际换行数计算高度（比 blockHeight 更精确） */
function blockHeightActual(block, colW) {
  var tag = block.tag;
  var text = blockText(block);
  if (!text) return blockHeight(block, colW);  // 非文本用估算

  var st = block.style || {};
  var fs = Number(st['font-size']) || 12;
  var lines = textLines(text, colW, fs);
  return Math.max(lines * fs / 96 * 2.0 + 0.10, 0.3);
}

function blockText(block) {
  var d = block.data || {}, tag = block.tag;
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'p' || tag === 'callout') return d.text || '';
  if (tag === 'list') return (d.items || []).map(function(it) { return typeof it === 'string' ? it : (it.text || ''); }).join(' ');
  return '';
}

module.exports = { textLines, itemHeight, blockHeight, blockHeightActual };
