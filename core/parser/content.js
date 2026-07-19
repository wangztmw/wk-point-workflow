/**
 * content.js — Markdown 正文解析
 *
 * parseContent: 逐行解析标题/表格/列表/段落/图片
 */

const AST = require('../meta-templates/types/ast');

/** 解析 Markdown 正文为结构化内容 */
function parseContent(text) {
  const lines = text.split('\n');
  const content = AST.createContent();
  content.raw = text;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // 标题
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const h = AST.createHeading(headingMatch[1].length, headingMatch[2]);
      content.headings.push(h);
      content.blocks.push(AST.createBlockLegacy('heading', h));
      i++; continue;
    }

    // 表格
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      content.table = parseTable(lines, i);
      if (content.table) {
        content.blocks.push(AST.createBlockLegacy('table', content.table));
        i += 2 + content.table.rows.length;
        continue;
      }
    }

    // 无序列表
    if (trimmed.match(/^[-*]\s+/)) {
      const { list, consumed } = parseUnorderedList(lines, i);
      content.lists.push(list);
      content.blocks.push(AST.createBlockLegacy('list', list));
      i += consumed; continue;
    }

    // 有序列表
    if (trimmed.match(/^\d+\.\s+/)) {
      const { list, consumed } = parseOrderedList(lines, i);
      content.lists.push(list);
      content.blocks.push(AST.createBlockLegacy('list', list));
      i += consumed; continue;
    }

    // 图片标签 <img:标签名>
    const imgTagMatch = trimmed.match(/^<img:(.+?)>$/);
    if (imgTagMatch) {
      content.images = content.images || [];
      const img = AST.createImageTag(imgTagMatch[1].trim());
      content.images.push(img);
      content.blocks.push(AST.createBlockLegacy('image-tag', img));
      i++; continue;
    }

    // 图片 ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      content.images = content.images || [];
      const img = AST.createImageMarkdown(imageMatch[1], imageMatch[2]);
      content.images.push(img);
      content.blocks.push(AST.createBlockLegacy('image', img));
      i++; continue;
    }

    // 普通段落
    const { paragraph, consumed } = parseParagraph(lines, i);
    if (paragraph) {
      content.paragraphs.push(paragraph);
      content.blocks.push(AST.createBlockLegacy('paragraph', paragraph));
    }
    i += consumed;
    if (consumed === 0) i++;
  }

  return content;
}

// ── 子解析器 ──

function parseTable(lines, startIdx) {
  if (startIdx >= lines.length) return null;
  const headerLine = lines[startIdx].trim();
  const headers = headerLine.split('|').map(s => s.trim()).filter(s => s.length > 0);
  if (headers.length === 0) return null;
  if (startIdx + 1 >= lines.length) return null;
  const sepLine = lines[startIdx + 1].trim();
  if (!sepLine.match(/^\|[\s\-:|]+\|$/)) return null;

  const rows = [];
  let i = startIdx + 2;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) break;
    const cells = trimmed.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (cells.length === 0) break;
    rows.push(cells); i++;
  }
  if (rows.length === 0) return null;
  return AST.createTable(headers, rows);
}

function parseUnorderedList(lines, startIdx) {
  const items = [];
  let i = startIdx;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^[-*]\s+(.+)/);
    if (!match) break;
    items.push(AST.createListItem(match[1], parseInline(match[1])));
    i++;
  }
  return { list: AST.createList(false, items), consumed: i - startIdx };
}

function parseOrderedList(lines, startIdx) {
  const items = [];
  let i = startIdx;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^\d+\.\s+(.+)/);
    if (!match) break;
    items.push(AST.createListItem(match[1], parseInline(match[1])));
    i++;
  }
  return { list: AST.createList(true, items), consumed: i - startIdx };
}

function parseParagraph(lines, startIdx) {
  const paraLines = [];
  let i = startIdx;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) break;
    if (trimmed.match(/^#{1,4}\s+/)) break;
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) break;
    if (trimmed.match(/^[-*]\s+/)) break;
    if (trimmed.match(/^\d+\.\s+/)) break;
    if (trimmed === '---') break;
    paraLines.push(lines[i]); i++;
  }
  if (paraLines.length === 0) return { paragraph: null, consumed: 0 };
  const text = paraLines.join('\n').trim();
  return { paragraph: AST.createParagraph(text, parseInline(text)), consumed: i - startIdx };
}

// ── 内联解析 ──

/** 解析 **粗体**，*斜体*，`代码` */
function parseInline(text) {
  const nodes = [];
  let remaining = text;
  let pos = 0;

  while (pos < remaining.length) {
    const boldMatch = remaining.slice(pos).match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.slice(pos).match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.slice(pos).match(/`([^`]+)`/);

    const matches = [
      boldMatch && { type: 'bold', match: boldMatch, start: pos + boldMatch.index },
      italicMatch && { type: 'italic', match: italicMatch, start: pos + italicMatch.index },
      codeMatch && { type: 'code', match: codeMatch, start: pos + codeMatch.index },
    ].filter(Boolean).sort((a, b) => a.start - b.start);

    if (matches.length === 0) {
      if (pos < remaining.length) nodes.push(AST.createInlineText(remaining.slice(pos)));
      break;
    }

    const m = matches[0];
    if (m.start > pos) nodes.push(AST.createInlineText(remaining.slice(pos, m.start)));

    if (m.type === 'bold') {
      nodes.push(AST.createInlineBold(m.match[1]));
      pos = m.start + m.match[0].length;
    } else if (m.type === 'italic') {
      nodes.push(AST.createInlineItalic(m.match[1]));
      pos = m.start + m.match[0].length;
    } else if (m.type === 'code') {
      nodes.push(AST.createInlineCode(m.match[1]));
      pos = m.start + m.match[0].length;
    }
  }

  return nodes;
}

module.exports = { parseContent, parseTable, parseUnorderedList, parseOrderedList, parseParagraph, parseInline };
