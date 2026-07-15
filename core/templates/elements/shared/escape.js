/**
 * escape.js — HTML 转义工具
 * 所有模板共用，消灭 10+ 处重复定义。
 */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { esc };
