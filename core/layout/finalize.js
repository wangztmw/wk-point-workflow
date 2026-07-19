/**
 * finalize.js — 收尾：同步 pos → style + 预渲染页面标题
 */

const pageTitle = require('../meta-templates/elements/text/page-title');

function finalize(ast, isLayout) {
  var blocks = ast.content.blocks || [];

  // 同步 pos → style
  for (var i = 0; i < blocks.length; i++) {
    var pos = blocks[i].pos;
    if (pos && pos.inches) {
      var st = blocks[i].style || {};
      st.x = pos.inches.x; st.y = pos.inches.y;
      st.w = pos.inches.w; st.h = pos.inches.h;
    }
  }

  // 预渲染页面标题（render 只读 ast._titleHTML）
  var title = ast.props.title || '';
  ast._titleHTML = isLayout && title
    ? '<div style="position:absolute;left:40px;top:20px;">' + pageTitle.render(title) + '</div>'
    : '';
}

module.exports = { finalize };
