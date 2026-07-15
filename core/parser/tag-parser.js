/**
 * tag-parser.js — 标签语法解析器
 *
 * 将标签化 Markdown 解析为 SlideAST[]（与旧解析器产出相同结构）。
 *
 * 标签格式：<type: content; key: value; key: value; ...>
 *   多行内容（list/table/chart/p）跟在标签行之后，
 *   直到下一个标签或 slide 边界。
 */

const AST = require('../../types/ast');

// 复用旧解析器的 splitSlides（复制，避免循环依赖）
function splitSlides(md) {
  const lines = md.split('\n');
  const slides = [];
  let current = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; current.push(line); continue; }
    if (!inCodeBlock && line.trim() === '---') {
      if (current.length > 0) { slides.push(current.join('\n').trim()); current = []; }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) slides.push(current.join('\n').trim());
  return slides;
}

// 复用旧解析器的 stripFormatting
function stripFormatting(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// 复用旧解析器的 parseInline
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

// ---- 主入口 ----

function parse(md) {
  const rawSlides = splitSlides(md);
  return rawSlides.map((raw, i) => parseSlide(raw, i)).filter(Boolean);
}

function detectTagSyntax(md) {
  // 扫描前 500 字符，找 <slide: 或 <h1: 等标签模式
  const head = md.slice(0, 500);
  return /^<[a-zA-Z][\w-]*:/.test(head) || /^<slide:/.test(head);
}

// ---- 幻灯片解析 ----

function parseSlide(raw, index) {
  if (!raw.trim()) return null;

  const lines = raw.split('\n');
  let i = 0;

  // 第一行必须是 <slide: ...>
  const firstLine = lines[0].trim();
  const slideTag = parseTagLine(firstLine);
  if (!slideTag) return null; // 非标签语法，跳过

  const type = slideTag.content || slideTag.style.type || 'content';
  const props = { ...slideTag.style };
  // slide 标签的 content 即 type
  if (slideTag.content) props._content = slideTag.content;
  i = 1;

  // 解析内容块
  const content = buildContent(lines, i);
  content.raw = raw;

  // 从内容中提取 title
  if (!props.title) {
    const h = content.headings.find(h => h.level <= 2);
    if (h) props.title = stripFormatting(h.text);
  }

  return AST.createSlide({ type, props, content, index, parser: 'tag' });
}

// ---- 内容构建 ----

function buildContent(lines, startIdx) {
  const content = AST.createContent();

  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (!trimmed) { i++; continue; }

    // 标签行
    const tag = parseTagLine(trimmed);
    if (tag) {
      i++;
      switch (tag.tag) {
        case 'h1': case 'h2': case 'h3': case 'h4': {
          const level = parseInt(tag.tag[1]);
          const h = AST.createHeading(level, tag.content);
          content.headings.push(h);
          content.blocks.push(AST.createBlock('heading', tag.tag, h, tag.style));
          break;
        }
        case 'p': {
          let text = tag.content;
          // 如果内容为空，收集后续普通文本行
          if (!text && i < lines.length) {
            const paraLines = [];
            while (i < lines.length) {
              const t = lines[i].trim();
              if (!t || parseTagLine(t)) break;
              paraLines.push(lines[i]);
              i++;
            }
            text = paraLines.join('\n').trim();
          }
          const p = AST.createParagraph(text, parseInline(text));
          content.paragraphs.push(p);
          content.blocks.push(AST.createBlock('paragraph', tag.tag, p, tag.style));
          break;
        }
        case 'list': {
          const listType = tag.style.type || 'bullet';
          const ordered = listType === 'ordered' || listType === 'ol';
          const items = [];
          while (i < lines.length) {
            const t = lines[i].trim();
            if (!t) { i++; continue; }
            if (parseTagLine(t)) break;
            const m = t.match(/^[-*]\s+(.+)/);
            const om = t.match(/^\d+\.\s+(.+)/);
            if (m) {
              items.push(AST.createListItem(m[1], parseInline(m[1])));
              i++;
            } else if (om && ordered) {
              items.push(AST.createListItem(om[1], parseInline(om[1])));
              i++;
            } else {
              break;
            }
          }
          const list = AST.createList(ordered, items);
          content.lists.push(list);
          content.blocks.push(AST.createBlock('list', tag.tag, list, tag.style));
          break;
        }
        case 'table': {
          const { table, consumed } = parseTableBlock(lines, i - 1);
          if (table) {
            content.table = table;
            content.blocks.push(AST.createBlock('table', tag.tag, table, tag.style));
            i = (i - 1) + consumed;
          }
          break;
        }
        case 'img': {
          const img = AST.createImageTag(tag.content);
          content.images.push(img);
          content.blocks.push(AST.createBlock('image', tag.tag, img, tag.style));
          break;
        }
        case 'box': {
          const box = AST.createBox();
          content.blocks.push(AST.createBlock('box', tag.tag, box, tag.style));
          break;
        }
        case 'chart': {
          // chart 标签后跟数据表格
          const chartType = tag.content || tag.style.chartType || 'bar';
          const { table: tab, consumed } = parseTableBlock(lines, i);
          if (tab) {
            content.table = tab;
            content.blocks.push(AST.createBlock('table', tag.tag, tab, { ...tag.style, chartType }));
            i += consumed;
          }
          break;
        }
        default:
          // 未知标签 → 跳过
          break;
      }
      continue;
    }

    // 非标签行（在老语法项目中不会出现，防御性处理）
    i++;
  }

  return content;
}

// ---- 标签行解析 ----

/**
 * 解析单行标签：<type: content; key: value; ...>
 * @returns {{ tag: string, content: string, style: object } | null}
 */
function parseTagLine(line) {
  const m = line.match(/^<([a-zA-Z][\w-]*):([^;>]*?)((?:\s*;[^;>]*)*)\s*>$/);
  if (!m) return null;
  return {
    tag: m[1].trim(),
    content: m[2].trim(),
    style: parseStyle(m[3]),
  };
}

/**
 * 解析样式串：; key: value; key: value
 * @returns {object}
 */
function parseStyle(str) {
  const style = {};
  if (!str) return style;

  // 按 ; 分割，处理 \; 转义
  const pairs = str.split(/(?<!\\);/);
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      // 无冒号的键视为布尔标志
      style[trimmed] = true;
    } else {
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();
      // 处理转义
      value = value.replace(/\\;/g, ';').replace(/\\:/g, ':').replace(/\\>/g, '>');
      style[key] = value;
    }
  }
  return style;
}

// ---- 表格块解析（复用逻辑） ----

function parseTableBlock(lines, startIdx) {
  if (startIdx >= lines.length) return { table: null, consumed: 0 };

  // 跳过空行找到表头
  let i = startIdx;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return { table: null, consumed: 0 };

  const headerLine = lines[i].trim();
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
    return { table: null, consumed: 0 };
  }

  const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
  if (headers.length === 0) return { table: null, consumed: 0 };

  // 分隔行
  i++;
  if (i >= lines.length) return { table: null, consumed: 0 };
  const sepLine = lines[i].trim();
  if (!sepLine.match(/^\|[\s\-:|]+\|$/)) {
    return { table: null, consumed: 0 };
  }

  // 数据行
  i++;
  const rows = [];
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t.startsWith('|') || !t.endsWith('|')) break;
    const cells = t.split('|').map(s => s.trim()).filter(Boolean);
    if (cells.length === 0) break;
    rows.push(cells);
    i++;
  }

  return {
    table: AST.createTable(headers, rows),
    consumed: i - startIdx,
  };
}

// ---- 导出 ----

module.exports = { parse, detectTagSyntax, parseTagLine, parseStyle };
