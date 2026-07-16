/**
 * html-layout-position.js — 从浏览器 DOM 读取实际渲染位置，补全 SLIDE_DATA
 *
 * 导出阶段调用 enrich(slideData)，遍历所有 tag-parsed 的布局类 slide，
 * 用 getBoundingClientRect() + getComputedStyle() 读取每个元素的
 * 实际像素位置和样式，写回 block.style。
 *
 * 之后 tag-export 正常读 block.style.x/y/w/h 即可得到精确坐标。
 */

/** rgb(r, g, b) → hex */
function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent') return '';
  var m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return '';
  return m.slice(0, 3).map(function(v) {
    var h = parseInt(v).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

/** 从 DOM 补全布局 slide 的 block 位置和样式 */
function enrich(slideData) {
  slideData.forEach(function(s) {
    if (s.parser !== 'tag') return;
    if (s.type !== 'stack' && s.type !== 'grid' && s.type !== 'split') return;

    var slideEl = document.querySelector('[data-slide="' + s.index + '"]');
    if (!slideEl) return;
    var slideR = slideEl.getBoundingClientRect();
    if (slideR.width === 0) return;  // slide 不可见
    var scale = slideR.width / 960;

    s.blocks.forEach(function(block, i) {
      var el = slideEl.querySelector('[data-block="' + i + '"]');
      if (!el) return;
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);

      // 位置（像素，tag-export 会 pxToIn 转英寸）
      block.style.x = Math.round((r.left - slideR.left) / scale);
      block.style.y = Math.round((r.top - slideR.top) / scale);
      block.style.w = Math.round(r.width / scale);
      block.style.h = Math.round(r.height / scale);

      // 样式（只在 block.style 未设置时补全）
      if (!block.style['font-size']) {
        block.style['font-size'] = Math.round(parseFloat(cs.fontSize));
      }
      if (!block.style.color || block.style.color === '333333') {
        var hex = rgbToHex(cs.color);
        if (hex) block.style.color = hex;
      }
      if (!block.style.align) {
        block.style.align = cs.textAlign;
      }
      // 背景色（用于 box 元素）
      var bg = rgbToHex(cs.backgroundColor);
      if (bg && bg !== 'ffffff' && !block.style['fill-color']) {
        block.style['fill-color'] = bg;
      }
    });
  });
}

module.exports = { enrich };
