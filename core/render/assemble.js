/**
 * assemble.js — 渲染编排中心
 *
 * 只读 layout 已处理好的数据：_html → 包裹 HTML，_ppt → 收集 slideData
 */

const { renderSlide } = require('./html-output');
const { buildSlideData } = require('./ppt-output');

function renderAll(ast, config) {
  // ① HTML: 读 block._html + block.pos.pixels → div 包裹
  renderSlide(ast, config);

  // ② PPT: 读 block._ppt + block.pos.inches → slideData
  ast._slideData = buildSlideData(ast);
}

module.exports = { renderAll };
