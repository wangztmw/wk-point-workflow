/**
 * assemble.js — 布局编排
 *
 * applyLayout: 补全 style 默认值 + stack/split/grid 位置计算
 */

const { fillStyleDefaults } = require('./style');
const { stackPositions, splitPositions, gridPositions } = require('./positions');

/** 为 AST 的 blocks 补全样式默认值，布局 slide 额外计算 x/y/w/h（英寸） */
function applyLayout(ast) {
  var blocks = ast.content.blocks || [];
  var t = ast.type;

  for (var i = 0; i < blocks.length; i++) {
    blocks[i].style = fillStyleDefaults(blocks[i]);
  }
  if (t !== 'stack' && t !== 'grid' && t !== 'split') return;

  var startY = ast.props.title ? 0.55 : 0.3;
  var positions;
  if (t === 'stack') positions = stackPositions(blocks, { startY: startY });
  else if (t === 'split') positions = splitPositions(blocks, { startY: startY });
  else if (t === 'grid') positions = gridPositions(blocks, { startY: startY });

  for (var i = 0; i < blocks.length; i++) {
    var p = positions[i] || {};
    var st = blocks[i].style || {};
    st.x = p.x; st.y = p.y; st.w = p.w; st.h = p.h;
  }
}

module.exports = { applyLayout };
