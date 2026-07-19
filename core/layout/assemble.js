/**
 * assemble.js — 布局编排
 *
 * applyLayout: 补全 style 默认值 + stack/split/grid 位置计算
 */

var AST = require('../meta-templates/types/ast');
var LAYOUTS = AST.LAYOUTS;
var { pageDef } = require('../meta-templates/pages/registry');

const { fillStyleDefaults } = require('./style');
const { bindElements } = require('./elements');
const { finalize } = require('./finalize');
const { centerContent } = require('./center');
const { validate } = require('./validate');
var PATTERNS = require('../meta-templates/patterns/registry');

function process(ast) {
  var blocks = ast.content.blocks || [];
  var t = ast.type;
  var def = LAYOUTS[t] || {};
  var isLayout = def.output === 'layout';
  var page = pageDef(ast);

  for (var i = 0; i < blocks.length; i++) {
    blocks[i].style = fillStyleDefaults(blocks[i]);
  }

  if (isLayout && def.pattern) {
    var pattern = PATTERNS[def.pattern];
    var box = { startY: page.contentTop, w: page.contentW, pageH: page.contentH };
    if (pattern) pattern.arrange(blocks, box);
    validate(blocks, page, box, pattern, 'pre');
  }

  bindElements(blocks, isLayout);
  if (isLayout && def.pattern) validate(blocks, page, box, PATTERNS[def.pattern], 'post');
  if (isLayout) centerContent(blocks, page);
  finalize(ast, isLayout);
}

// 保留旧名向后兼容
function applyLayout(ast) { process(ast); }

module.exports = { process, applyLayout };
