/**
 * style.js — block.style 默认值补全
 */

var AST = require('../meta-templates/types/ast');

/** 补全 block.style 的默认值（保留 chartType 等非标准属性） */
function fillStyleDefaults(block) {
  var tag = block.tag;
  var st = block.style || {};
  var def = AST.TAGS[tag] || AST.TAGS['h2'];

  var result = {};
  var keys = Object.keys(st);
  for (var i = 0; i < keys.length; i++) {
    result[keys[i]] = st[keys[i]];
  }
  if (!result['font-size']) result['font-size'] = def.fs || '13';
  if (!result.color) result.color = def.color || '333333';
  if (!result.bold) result.bold = def.bold || 'false';
  if (!result.align) result.align = 'left';
  if (result['fill-color'] === undefined) result['fill-color'] = '';
  if (result['border-color'] === undefined) result['border-color'] = '';
  if (result['border-width'] === undefined) result['border-width'] = '0';
  return result;
}

module.exports = { fillStyleDefaults };
