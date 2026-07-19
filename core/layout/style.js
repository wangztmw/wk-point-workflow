/**
 * style.js — block.style 默认值补全
 */

/** 补全 block.style 的默认值（保留 chartType 等非标准属性） */
function fillStyleDefaults(block) {
  var tag = block.tag;
  var st = block.style || {};
  var defaultFS = {h1:'32',h2:'24',h3:'18',h4:'16',p:'13',list:'12'};

  var result = {};
  var keys = Object.keys(st);
  for (var i = 0; i < keys.length; i++) {
    result[keys[i]] = st[keys[i]];
  }
  if (!result['font-size']) result['font-size'] = defaultFS[tag] || '13';
  if (!result.color) result.color = ((tag==='h1'||tag==='h2')?'1a1a1a':'333333');
  if (!result.bold) result.bold = ((tag==='h1'||tag==='h2')?'true':'false');
  if (!result.align) result.align = 'left';
  if (result['fill-color'] === undefined) result['fill-color'] = '';
  if (result['border-color'] === undefined) result['border-color'] = '';
  if (result['border-width'] === undefined) result['border-width'] = '0';
  return result;
}

module.exports = { fillStyleDefaults };
