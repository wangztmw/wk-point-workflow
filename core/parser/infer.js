/**
 * infer.js — 类型推断 + 文本工具
 */

/** 根据内容推断幻灯片类型 */
function inferType(content) {
  if (content.headings.length === 1 && content.headings[0].level === 1
      && content.paragraphs.length === 0 && !content.table) {
    return 'title';
  }
  if (content.table) return 'chart';
  if (content.lists.length > 0 && content.headings.length >= 2) {
    return 'summary';
  }
  return 'content';
}

/** 去掉 Markdown 格式标记，返回纯文本 */
function stripFormatting(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

module.exports = { inferType, stripFormatting };
