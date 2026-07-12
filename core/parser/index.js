/**
 * parser.js — Markdown → SlideAST 解析器
 *
 * 将 Markdown 源文件解析为结构化的幻灯片 AST 数组。
 * 核心约定：
 *   - `---` 分隔幻灯片
 *   - `<!-- slide: type, key=value -->` 定义类型和属性
 *   - Markdown 表格可被 chart 类型自动转为图表数据
 *
 * 纯 JavaScript，零依赖，约 250 行。
 */

// ============================================================
// 1. 主入口
// ============================================================

/**
 * 解析 Markdown 字符串，返回幻灯片 AST 数组
 * @param {string} md - Markdown 源文本
 * @returns {SlideAST[]}
 */
function parse(md) {
  const rawSlides = splitSlides(md);
  return rawSlides.map((raw, i) => parseSlide(raw, i)).filter(Boolean);
}

// ============================================================
// 2. 幻灯片分割
// ============================================================

/**
 * 按 `\n---\n` 分割为原始幻灯片块
 * 避免分割代码块和表格中的 `---`
 */
function splitSlides(md) {
  const lines = md.split('\n');
  const slides = [];
  let current = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // 检测代码块边界
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      current.push(line);
      continue;
    }

    // 分隔符：独立的 ---，不在代码块中
    if (!inCodeBlock && line.trim() === '---') {
      if (current.length > 0) {
        slides.push(current.join('\n').trim());
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  // 最后一个 slide
  if (current.length > 0) {
    slides.push(current.join('\n').trim());
  }

  return slides;
}

// ============================================================
// 3. 单页幻灯片解析
// ============================================================

/**
 * 解析单个幻灯片块
 * @param {string} raw - 原始文本
 * @param {number} index - 幻灯片序号
 * @returns {SlideAST|null}
 */
function parseSlide(raw, index) {
  if (!raw.trim()) return null;

  // 3a. 提取 HTML 注释指令
  const directive = extractDirective(raw);
  let body = raw;
  if (directive) {
    body = raw.replace(/<!--\s*slide:.*?-->/, '').trim();
  }

  // 3b. 解析 Markdown 内容
  const content = parseContent(body);

  // 3c. 确定幻灯片类型
  const type = directive ? directive.type : inferType(content);

  // 3d. 组装 props
  const props = directive ? { ...directive.props } : {};
  // 从内容中提取第一个 h1/h2 作为 title（如果没有显式指定）
  if (!props.title) {
    const h = content.headings.find(h => h.level <= 2);
    if (h) props.title = stripFormatting(h.text);
  }

  return {
    type,
    props,
    content,
    index,
  };
}

// ============================================================
// 4. 指令提取
// ============================================================

/**
 * 提取 <!-- slide: type, key=value, ... --> 注释
 * @returns {{ type: string, props: object } | null}
 */
function extractDirective(text) {
  const match = text.match(/<!--\s*slide:\s*([^>]+?)\s*-->/);
  if (!match) return null;

  const parts = match[1].split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const type = parts[0];
  const props = {};

  for (let i = 1; i < parts.length; i++) {
    const kv = parts[i].split('=').map(s => s.trim());
    if (kv.length === 2) {
      props[kv[0]] = kv[1].replace(/^["']|["']$/g, ''); // 去掉引号
    } else {
      // 没有 = 的值，视为布尔标志
      props[kv[0]] = true;
    }
  }

  return { type, props };
}

// ============================================================
// 5. Markdown 内容解析
// ============================================================

/**
 * 解析 Markdown 正文为结构化内容
 * @param {string} text
 * @returns {SlideContent}
 */
function parseContent(text) {
  const lines = text.split('\n');
  const content = {
    headings: [],
    paragraphs: [],
    lists: [],
    table: null,
    raw: text,
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (!trimmed) {
      i++;
      continue;
    }

    // 标题
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      content.headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // 表格（以 | 开头和结尾，或连续两行都有 |）
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      content.table = parseTable(lines, i);
      if (content.table) {
        // 跳过分隔行
        i += 2 + content.table.rows.length;
        continue;
      }
    }

    // 无序列表（连续的 - 或 * 开头行）
    if (trimmed.match(/^[-*]\s+/)) {
      const { list, consumed } = parseUnorderedList(lines, i);
      content.lists.push(list);
      i += consumed;
      continue;
    }

    // 有序列表（连续的数字. 开头行）
    if (trimmed.match(/^\d+\.\s+/)) {
      const { list, consumed } = parseOrderedList(lines, i);
      content.lists.push(list);
      i += consumed;
      continue;
    }

    // 图片 ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      content.images = content.images || [];
      content.images.push({
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      i++;
      continue;
    }

    // 普通段落：收集连续的非空行直到遇到特殊行
    const { paragraph, consumed } = parseParagraph(lines, i);
    if (paragraph) {
      content.paragraphs.push(paragraph);
    }
    i += consumed;

    // 安全检查
    if (consumed === 0) i++;
  }

  return content;
}

// ============================================================
// 6. 子解析器
// ============================================================

function parseTable(lines, startIdx) {
  if (startIdx >= lines.length) return null;

  const headerLine = lines[startIdx].trim();
  const headers = headerLine
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (headers.length === 0) return null;

  // 下一行应该是分隔行 `|------|------|`
  if (startIdx + 1 >= lines.length) return null;
  const sepLine = lines[startIdx + 1].trim();
  if (!sepLine.match(/^\|[\s\-:|]+\|$/)) return null;

  // 收集数据行
  const rows = [];
  let i = startIdx + 2;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) break;
    const cells = trimmed
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (cells.length === 0) break;
    rows.push(cells);
    i++;
  }

  if (rows.length === 0) return null;

  return { headers, rows };
}

function parseUnorderedList(lines, startIdx) {
  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^[-*]\s+(.+)/);
    if (!match) break;
    items.push({ text: match[1], inlineMarkup: parseInline(match[1]) });
    i++;
  }

  return {
    list: { type: 'list', ordered: false, items },
    consumed: i - startIdx,
  };
}

function parseOrderedList(lines, startIdx) {
  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^\d+\.\s+(.+)/);
    if (!match) break;
    items.push({ text: match[1], inlineMarkup: parseInline(match[1]) });
    i++;
  }

  return {
    list: { type: 'list', ordered: true, items },
    consumed: i - startIdx,
  };
}

function parseParagraph(lines, startIdx) {
  const paraLines = [];
  let i = startIdx;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // 遇到空行、标题、列表项、表格 → 段落结束
    if (!trimmed) break;
    if (trimmed.match(/^#{1,4}\s+/)) break;
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) break;
    if (trimmed.match(/^[-*]\s+/)) break;
    if (trimmed.match(/^\d+\.\s+/)) break;
    if (trimmed === '---') break;

    paraLines.push(lines[i]);
    i++;
  }

  if (paraLines.length === 0) return { paragraph: null, consumed: 0 };

  const text = paraLines.join('\n').trim();
  return {
    paragraph: {
      type: 'paragraph',
      text,
      inlineMarkup: parseInline(text),
    },
    consumed: i - startIdx,
  };
}

// ============================================================
// 7. 内联标记解析
// ============================================================

/**
 * 解析内联格式：**粗体**，*斜体*，`代码`
 * @returns {InlineNode[]}
 */
function parseInline(text) {
  const nodes = [];
  let remaining = text;
  let pos = 0;

  while (pos < remaining.length) {
    // 粗体 **text**
    const boldMatch = remaining.slice(pos).match(/\*\*(.+?)\*\*/);
    // 斜体 *text*
    const italicMatch = remaining.slice(pos).match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // 行内代码 `text`
    const codeMatch = remaining.slice(pos).match(/`([^`]+)`/);

    // 找最近的匹配
    const matches = [
      boldMatch && { type: 'bold', match: boldMatch, start: pos + boldMatch.index },
      italicMatch && { type: 'italic', match: italicMatch, start: pos + italicMatch.index },
      codeMatch && { type: 'code', match: codeMatch, start: pos + codeMatch.index },
    ].filter(Boolean).sort((a, b) => a.start - b.start);

    if (matches.length === 0) {
      // 没有更多标记，剩余都是普通文本
      if (pos < remaining.length) {
        nodes.push({ type: 'text', value: remaining.slice(pos) });
      }
      break;
    }

    const m = matches[0];

    // 标记前的普通文本
    if (m.start > pos) {
      nodes.push({ type: 'text', value: remaining.slice(pos, m.start) });
    }

    // 标记内容
    if (m.type === 'bold') {
      nodes.push({ type: 'bold', content: [{ type: 'text', value: m.match[1] }] });
      pos = m.start + m.match[0].length;
    } else if (m.type === 'italic') {
      nodes.push({ type: 'italic', content: [{ type: 'text', value: m.match[1] }] });
      pos = m.start + m.match[0].length;
    } else if (m.type === 'code') {
      nodes.push({ type: 'code', value: m.match[1] });
      pos = m.start + m.match[0].length;
    }
  }

  return nodes;
}

// ============================================================
// 8. 辅助函数
// ============================================================

/**
 * 根据内容推断幻灯片类型
 */
function inferType(content) {
  if (content.headings.length === 1 && content.headings[0].level === 1
      && content.paragraphs.length === 0 && !content.table) {
    return 'title';
  }
  if (content.table) return 'chart';
  if (content.lists.length > 0 && content.headings.length >= 2) {
    return 'summary'; // 多个 h2/h3 + 列表 → 总结页
  }
  return 'content';
}

/**
 * 去掉 Markdown 格式标记，返回纯文本
 */
function stripFormatting(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ============================================================
// 9. 导出
// ============================================================

module.exports = { parse, parseSlide, splitSlides, parseContent, parseInline, stripFormatting };

// ============================================================
// 10. 类型定义（文档参考）
// ============================================================
/**
 * @typedef {Object} SlideAST
 * @property {string} type - 幻灯片类型: title | content | chart | summary | two-column
 * @property {Object} props - 属性键值对（来自 HTML 注释）
 * @property {string} [props.title] - 幻灯片标题
 * @property {string} [props.chartType] - 图表类型: bar | pie | line | radar
 * @property {SlideContent} content - 解析后的内容
 * @property {number} index - 幻灯片序号 (0-based)
 *
 * @typedef {Object} SlideContent
 * @property {Array<{level:number, text:string}>} headings
 * @property {Array<{type:string, text:string, inlineMarkup:Array}>} paragraphs
 * @property {Array<{type:string, ordered:boolean, items:Array}>} lists
 * @property {{headers:string[], rows:string[][]}|null} table
 * @property {string} raw
 *
 * @typedef {Object} InlineNode
 * @property {string} type - text | bold | italic | code | link
 * @property {string} [value]
 * @property {Array<InlineNode>} [content]
 */
