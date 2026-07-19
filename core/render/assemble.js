/**
 * assemble.js — 渲染编排中心
 *
 * 串联 blocks → slides → ppt-data 三步，统一输出 ast._html + ast._slideData
 */

const { renderBlocks } = require('./blocks');
const { renderSlide } = require('./slides');
const { buildSlideData } = require('./ppt-data');

function renderAll(ast, config) {
  var isLayout = ast.type === 'stack' || ast.type === 'grid' || ast.type === 'split';

  // ① blocks: _html + _ppt + rect
  renderBlocks(ast.content.blocks, isLayout);

  // ② slides: ast._html（最终 HTML 字符串）
  renderSlide(ast, config);

  // ③ ppt-data: ast._slideData（PPT 引擎用的 JSON）
  ast._slideData = buildSlideData(ast);
}

module.exports = { renderAll };
