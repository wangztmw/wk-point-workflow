/**
 * to-shapes.js — SVG → 矢量图形元素
 *
 * 将 SVG 中的 <rect> <text> <line> <circle> 转为背景元素数组。
 * 坐标从 SVG 像素（960×540）换算到 PptxGenJS 英寸（10×5.625）。
 */

const SVG_W = 960, SVG_H = 540;
const PPT_W = 10, PPT_H = 5.625;

function px2in(px) { return (px / SVG_W) * PPT_W; }
function py2in(py) { return (py / SVG_H) * PPT_H; }

/**
 * SVG 字符串 → elements 数组
 * @param {string} svgString
 * @returns {{ elements: Array, safeArea: Object }}
 */
function parse(svgString) {
  const elements = [];

  // 提取 <rect>
  const rectRe = /<rect\s+([^>]*?)\s*\/?>/gi;
  let m;
  while ((m = rectRe.exec(svgString)) !== null) {
    const attrs = parseAttrs(m[1]);
    const x = px2in(parseFloat(attrs.x) || 0);
    const y = py2in(parseFloat(attrs.y) || 0);
    const w = px2in(parseFloat(attrs.width) || 0);
    const h = py2in(parseFloat(attrs.height) || 0);
    const fill = attrs.fill || 'transparent';
    const rx = attrs.rx ? px2in(parseFloat(attrs.rx)) : 0;
    const opacity = attrs.opacity ? parseFloat(attrs.opacity) : 1;

    // 跳过全幅背景底板（大面积白色/浅色矩形）
    var isFullBg = (parseFloat(attrs.width) > 900 && parseFloat(attrs.height) > 500
                    && /^#(f[0-9a-f]{5}|[eE][0-9a-f]{5}|fff|FFF|white|transparent)/i.test(fill));
    if (w > 0.01 && h > 0.01 && !isFullBg) {
      elements.push({
        type: 'rect', x, y, w, h,
        fill: fill === 'transparent' || fill === 'none' ? 'transparent' : cleanColor(fill),
        rectRadius: rx || 0,
        opacity: opacity < 1 ? opacity : undefined,
      });
    }
  }

  // 提取 <line>
  const lineRe = /<line\s+([^>]*?)\s*\/?>/gi;
  while ((m = lineRe.exec(svgString)) !== null) {
    const attrs = parseAttrs(m[1]);
    const x1 = px2in(parseFloat(attrs.x1) || 0);
    const y1 = py2in(parseFloat(attrs.y1) || 0);
    const x2 = px2in(parseFloat(attrs.x2) || 0);
    const y2 = py2in(parseFloat(attrs.y2) || 0);
    const stroke = attrs.stroke || '#000';
    const sw = parseFloat(attrs['stroke-width']) || 1;

    elements.push({
      type: 'line', x: x1, y: y1, w: Math.max(x2 - x1, 0.01), h: 0,
      stroke: cleanColor(stroke),
      strokeWidth: sw * 0.5, // SVG px → roughly pt
    });
  }

  // 提取 <text>
  const textRe = /<text\s+([^>]*?)>([^<]*)<\/text>/gi;
  while ((m = textRe.exec(svgString)) !== null) {
    const attrs = parseAttrs(m[1]);
    const text = m[2].trim();
    if (!text) continue;
    const x = px2in(parseFloat(attrs.x) || 0);
    const y = py2in(parseFloat(attrs.y) || 0);
    const fontSize = parseFloat(attrs['font-size']) || 12;
    const fill = attrs.fill || '#000';
    const fontWeight = (attrs['font-weight'] || '').includes('bold') ? 'bold' : 'normal';
    const textAnchor = attrs['text-anchor'] || 'start';
    const opacity = attrs.opacity ? parseFloat(attrs.opacity) : 1;

    elements.push({
      type: 'text', x, y, text,
      fontSize: Math.round(fontSize * 0.75), // SVG px → roughly pt
      color: cleanColor(fill),
      bold: fontWeight === 'bold',
      align: textAnchor === 'end' ? 'right' : (textAnchor === 'middle' ? 'center' : 'left'),
      opacity: opacity < 1 ? opacity : undefined,
    });
  }

  // 提取 <circle>
  const circleRe = /<circle\s+([^>]*?)\s*\/?>/gi;
  while ((m = circleRe.exec(svgString)) !== null) {
    const attrs = parseAttrs(m[1]);
    const cx = px2in(parseFloat(attrs.cx) || 0);
    const cy = py2in(parseFloat(attrs.cy) || 0);
    const r = px2in(parseFloat(attrs.r) || 0);
    const fill = attrs.fill || 'transparent';
    const opacity = attrs.opacity ? parseFloat(attrs.opacity) : 1;

    elements.push({
      type: 'oval', x: cx - r, y: cy - r, w: r * 2, h: r * 2,
      fill: cleanColor(fill),
      opacity: opacity < 1 ? opacity : undefined,
    });
  }

  // 安全区：顶部元素底部到 56px（页眉下方），底部元素顶部到 510px（页脚上方）
  const safeArea = { top: 60, left: 40, width: 880, height: 440 };

  return { elements, safeArea };
}

// ============================================================
// 辅助
// ============================================================

function parseAttrs(str) {
  const attrs = {};
  const re = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/** 去掉 # 号，处理 url(#...) 渐变引用 */
function cleanColor(c) {
  if (!c || c === 'none' || c === 'transparent') return 'transparent';
  if (c.startsWith('url(#')) return '0f3460'; // 渐变引用 → 深海军蓝
  return c.replace('#', '');
}

module.exports = { parse };
