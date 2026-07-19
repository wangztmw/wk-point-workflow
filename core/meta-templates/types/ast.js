/**
 * types/ast.js — SlideAST 唯一真相源
 *
 * 所有 AST 节点的构造和校验集中在此。
 * parser 通过工厂函数创建节点，确保结构一致。
 * html-engine / ppt-engine 通过校验函数检查输入（可选）。
 *
 * 原则：
 *   - 字段名和类型以此为唯一真相
 *   - 工厂函数设置默认值，减少 parser 里的样板代码
 *   - 校验函数在开发期捕获结构错误，生产环境可跳过
 */

// ============================================================
// 1. 常量
// ============================================================

const SLIDE_TYPES = [
  'title', 'content', 'summary', 'two-column', 'three-column',
  'toc', 'section', 'ending', 'kpi-grid',
  'chart', 'table', 'quote',
  'image-text', 'image-full', 'image-grid', 'image-gallery',
  'timeline',
  'stack', 'grid', 'split',
];

const CHART_TYPES = [
  'bar', 'pie', 'line', 'radar', 'pareto', 'compare', 'waterfall', 'waterfall2',
];

const BLOCK_TYPES = [
  'heading', 'paragraph', 'list', 'table', 'image', 'image-tag', 'box',
];

const INLINE_TYPES = ['text', 'bold', 'italic', 'code'];

// ============================================================
// 2. 工厂 — SlideAST
// ============================================================

function createSlide({ type, props, content, index, parser }) {
  return {
    type: type || 'content',
    props: props || {},
    content: content || createContent(),
    index: index || 0,
    parser: parser || undefined,  // 'tag' | undefined（老解析器不设）
  };
}

// ============================================================
// 3. 工厂 — SlideContent
// ============================================================

function createContent() {
  return {
    headings: [],
    paragraphs: [],
    lists: [],
    table: null,
    images: [],
    blocks: [],
    raw: '',
  };
}

// ============================================================
// 4. 工厂 — 内容元素
// ============================================================

function createHeading(level, text) {
  return { level, text };
}

function createParagraph(text, inlineMarkup) {
  return {
    type: 'paragraph',
    text: text || '',
    inlineMarkup: inlineMarkup || [createInlineText(text || '')],
  };
}

function createList(ordered, items) {
  return {
    type: 'list',
    ordered: !!ordered,
    items: items || [],
  };
}

function createListItem(text, inlineMarkup) {
  return {
    text: text || '',
    inlineMarkup: inlineMarkup || [createInlineText(text || '')],
  };
}

function createTable(headers, rows) {
  return {
    headers: headers || [],
    rows: rows || [],
  };
}

/** <img:标签名> 语法 */
function createImageTag(label) {
  return { label: label || '', src: '' };
}

/** ![alt](url) 语法 */
function createImageMarkdown(alt, src) {
  return { alt: alt || '', src: src || '' };
}

/** 装饰矩形容器 */
function createBox() {
  return { type: 'box' };
}

// ============================================================
// 5. 工厂 — Block（标签解析器使用）
// ============================================================

function createBlock(type, tag, data, style) {
  return {
    type: type || 'paragraph',
    tag: tag || null,
    data: data || {},
    style: style || {},
  };
}

/** 老解析器的 block（无 tag/style 字段） */
function createBlockLegacy(type, data) {
  return { type, data };
}

// ============================================================
// 6. 工厂 — InlineNode
// ============================================================

function createInlineText(value) {
  return { type: 'text', value: String(value || '') };
}

function createInlineBold(content) {
  if (typeof content === 'string') content = [createInlineText(content)];
  return { type: 'bold', content: content || [] };
}

function createInlineItalic(content) {
  if (typeof content === 'string') content = [createInlineText(content)];
  return { type: 'italic', content: content || [] };
}

function createInlineCode(value) {
  return { type: 'code', value: String(value || '') };
}

// ============================================================
// 7. 校验
// ============================================================

function validateSlide(ast) {
  const errors = [];
  if (!ast) return { valid: false, errors: ['ast is null'] };

  if (!ast.type || !SLIDE_TYPES.includes(ast.type)) {
    errors.push('Invalid type: ' + ast.type);
  }
  if (!ast.props || typeof ast.props !== 'object') {
    errors.push('props must be an object');
  }
  if (!ast.content) {
    errors.push('content is required');
  } else {
    const c = ast.content;
    if (!Array.isArray(c.headings)) errors.push('content.headings must be array');
    if (!Array.isArray(c.paragraphs)) errors.push('content.paragraphs must be array');
    if (!Array.isArray(c.lists)) errors.push('content.lists must be array');
    if (c.table !== null && c.table !== undefined && (typeof c.table !== 'object' || Array.isArray(c.table))) {
      errors.push('content.table must be object or null');
    }
    if (!Array.isArray(c.blocks)) errors.push('content.blocks must be array');
  }
  if (ast.index !== undefined && typeof ast.index !== 'number') {
    errors.push('index must be a number');
  }

  return { valid: errors.length === 0, errors };
}

function validateBlock(block) {
  const errors = [];
  if (!block) return { valid: false, errors: ['block is null'] };

  if (!block.type || !BLOCK_TYPES.includes(block.type)) {
    errors.push('Invalid block type: ' + block.type);
  }
  if (!block.data || typeof block.data !== 'object') {
    errors.push('block.data must be an object');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// 8. 导出
// ============================================================

module.exports = {
  // 常量
  SLIDE_TYPES,
  CHART_TYPES,
  BLOCK_TYPES,
  INLINE_TYPES,

  // SlideAST
  createSlide,
  createContent,

  // 内容元素
  createHeading,
  createParagraph,
  createList,
  createListItem,
  createTable,
  createImageTag,
  createImageMarkdown,
  createBox,

  // Block
  createBlock,
  createBlockLegacy,

  // InlineNode
  createInlineText,
  createInlineBold,
  createInlineItalic,
  createInlineCode,

  // 校验
  validateSlide,
  validateBlock,

  // tag 元数据（唯一真相源：样式默认值）
  TAGS: {
    h1: {fs:'32', color:'1a1a1a', bold:'true'},
    h2: {fs:'24', color:'1a1a1a', bold:'true'},
    h3: {fs:'18', color:'333333'},
    h4: {fs:'15', color:'333333'},
    p:  {fs:'13', color:'555555'},
    list: {fs:'12', color:'444444'},
    table: {fs:'11'},
    img: {},
    chart: {},
  },
};
