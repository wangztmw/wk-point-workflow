/**
 * coordinates.js — 坐标转换工具
 *
 * 画布基准：HTML 960×540px，PPT 10×5.625 英寸，DPI=96。
 * 所有标签语法中的 x/y/w/h 单位为像素（px），
 * 导出 PPT 时通过 pxToInches() 转为英寸。
 */

const SCALE = {
  HTML_W: 960,
  HTML_H: 540,
  PPTX_W: 10,
  PPTX_H: 5.625,
  DPI: 96,
};

/** px → 英寸 */
function pxToInches(px) {
  return Number((px / SCALE.DPI).toFixed(3));
}

/** 英寸 → px */
function inchesToPx(inches) {
  return Math.round(inches * SCALE.DPI);
}

/**
 * style 对象 → HTML 内联 CSS 片段
 * {x:70, y:48, w:820, h:36} → "position:absolute;left:70px;top:48px;width:820px;height:36px"
 */
function styleToHtml(style) {
  if (!style) return '';
  const parts = ['position:absolute'];
  if (style.x !== undefined) parts.push('left:' + style.x + 'px');
  if (style.y !== undefined) parts.push('top:' + style.y + 'px');
  if (style.w !== undefined) parts.push('width:' + style.w + 'px');
  if (style.h !== undefined) parts.push('height:' + style.h + 'px');
  return parts.join(';');
}

/**
 * style 对象 → PPT 矩形坐标（英寸）
 */
function styleToPptxRect(style, defaults) {
  const d = defaults || {};
  return {
    x: pxToInches(style.x !== undefined ? style.x : (d.x || 0)),
    y: pxToInches(style.y !== undefined ? style.y : (d.y || 0)),
    w: pxToInches(style.w !== undefined ? style.w : (d.w || 820)),
    h: pxToInches(style.h !== undefined ? style.h : (d.h || 40)),
  };
}

/**
 * 从标签层级获取字号默认值
 */
function defaultFontSize(tag) {
  const map = { h1: 32, h2: 24, h3: 18, h4: 15, p: 13, list: 12, table: 11 };
  return map[tag] || 13;
}

/**
 * 从 style 读取外观属性，缺失时用默认值
 */
function styleToFontProps(style, tag) {
  return {
    fontSize: style['font-size'] || defaultFontSize(tag),
    color: style.color || '333333',
    bold: style.bold === 'true' || style.bold === true || tag === 'h1' || tag === 'h2',
    italic: style.italic === 'true' || style.italic === true,
    align: style.align || 'left',
  };
}

// ============================================================
// 文字自适应
// ============================================================

/**
 * 计算文本框能容纳的最大行数
 * @param {number} boxH - 文本框高度(px)
 * @param {number} fontSize - 字号(px)
 * @param {number} lineHeight - 行高倍数，默认 1.6
 */
function maxFitLines(boxH, fontSize, lineHeight) {
  const lh = fontSize * (lineHeight || 1.6);
  return Math.max(1, Math.floor(boxH / lh));
}

/**
 * 估算单行最大字符数（中文字符≈字号宽度，英文≈0.5倍）
 * @param {number} boxW - 文本框宽度(px)
 * @param {number} fontSize - 字号(px)
 */
function charsPerLine(boxW, fontSize) {
  // 混合文本：取中文和英文宽度的加权平均 ~0.7 个中文字宽
  return Math.max(1, Math.floor(boxW / (fontSize * 0.7)));
}

/**
 * 将文本截断到指定行数，末行加省略号
 * @param {string} text - 原始文本
 * @param {number} maxLines - 最大行数
 * @param {number} charsPerLine - 每行字符数
 * @returns {string}
 */
function truncateText(text, maxLines, cpl) {
  if (!text) return '';
  const totalChars = maxLines * cpl;
  if (text.length <= totalChars) return text;
  // 截断，末行留 1 个字符位置给 …
  const cut = maxLines * cpl - 1;
  return text.slice(0, cut).replace(/\s+$/, '') + '…';
}

/**
 * 生成 CSS line-clamp 样式
 * @param {number} maxLines - 最大行数
 * @returns {string} 内联 CSS 片段
 */
function lineClampCSS(maxLines) {
  return `display:-webkit-box;-webkit-line-clamp:${maxLines};-webkit-box-orient:vertical;overflow:hidden;`;
}

module.exports = {
  SCALE,
  pxToInches,
  inchesToPx,
  styleToHtml,
  styleToPptxRect,
  defaultFontSize,
  styleToFontProps,
  maxFitLines,
  charsPerLine,
  truncateText,
  lineClampCSS,
};
