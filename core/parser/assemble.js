/**
 * assemble.js — Markdown 解析编排中心
 *
 * 调 split → content → infer → normalize 子模块，组装最终 SlideAST。
 */

const AST = require('../meta-templates/types/ast');
const { splitSlides, extractDirective } = require('./split');
const { parseContent } = require('./content');
const { normalizeToTag } = require('./normalize');
const { inferType, stripFormatting } = require('./infer');

/** 解析 Markdown 字符串，返回 SlideAST 数组 */
function parse(md) {
  const rawSlides = splitSlides(md);
  return rawSlides.map((raw, i) => parseSlide(raw, i)).filter(Boolean);
}

/** 解析单个幻灯片块 */
function parseSlide(raw, index) {
  if (!raw.trim()) return null;

  const directive = extractDirective(raw);
  let body = raw;
  if (directive) {
    body = raw.replace(/<!--\s*slide:.*?-->/, '').trim();
  }

  const content = parseContent(body);
  const type = directive ? directive.type : inferType(content);
  const props = directive ? { ...directive.props } : {};

  if (!props.title) {
    const h = content.headings.find(h => h.level <= 2);
    if (h) props.title = stripFormatting(h.text);
  }

  var ast = AST.createSlide({ type, props, content, index });
  normalizeToTag(ast);
  return ast;
}

// ── 导出 ──
module.exports = { parse, parseSlide };
// 标签解析器
module.exports.parseTag = require('./tag-parser').parse;
module.exports.detectTagSyntax = require('./tag-parser').detectTagSyntax;
