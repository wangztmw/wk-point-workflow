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

module.exports = {
  SCALE,
  pxToInches,
  inchesToPx,
  styleToHtml,
  styleToPptxRect,
  defaultFontSize,
  styleToFontProps,
};
