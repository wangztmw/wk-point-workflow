/**
 * assemble.js — 布局编排
 *
 * applyLayout: 补全 style 默认值 + stack/split/grid 位置计算
 */

const { fillStyleDefaults } = require('./style');
const { bindElements } = require('./elements');
const { finalize } = require('./finalize');
const stack = require('../meta-templates/patterns/stack');
const split = require('../meta-templates/patterns/split');
const grid  = require('../meta-templates/patterns/grid');

/** 一次完成 AST 的所有处理：默认值 → 排列 → 模板绑定 → 标题 */
function process(ast) {
  var blocks = ast.content.blocks || [];
  var t = ast.type;
  var isLayout = t === 'stack' || t === 'grid' || t === 'split';

  // ① 补全默认样式
  for (var i = 0; i < blocks.length; i++) {
    blocks[i].style = fillStyleDefaults(blocks[i]);
  }

  // ② 布局排列（仅 stack/split/grid）
  if (isLayout) {
    var box = { startY: ast.props.title ? 0.55 : 0.3 };
    if (t === 'stack') stack.arrange(blocks, box);
    else if (t === 'split') split.arrange(blocks, box);
    else if (t === 'grid') grid.arrange(blocks, box);
  }

  // ③ 绑定元素模板 → _html + _ppt + rect
  bindElements(blocks, isLayout);

  // ④ 同步 style + 预渲染标题
  finalize(ast, isLayout);
}

// 保留旧名向后兼容
function applyLayout(ast) { process(ast); }

module.exports = { process, applyLayout };
