/**
 * normalize.js — markdown→tag 转换
 *
 * normalizeToTag: 给每个 block 加 tag/style，slide type 映射，深色颜色，自动堆叠坐标
 * convertTocBlocks: TOC 特殊处理
 */

const AST = require('../meta-templates/types/ast');
const { stripFormatting } = require('./infer');

// slide type → tag 布局类型
var TYPE_MAP = {
  content:'stack', summary:'grid', 'two-column':'split', 'three-column':'split',
  toc:'stack', 'kpi-grid':'grid', table:'stack',
  title:'title', section:'section', ending:'ending', quote:'tag-slide',
  chart:'chart', timeline:'tag-slide',
  'image-gallery':'tag-slide', 'image-grid':'tag-slide',
  'image-text':'tag-slide', 'image-full':'tag-slide',
};

// tag 默认样式
var TAG_STYLE = {
  h1: {'font-size':'32',color:'1a1a1a',bold:'true'},
  h2: {'font-size':'24',color:'1a1a1a',bold:'true'},
  h3: {'font-size':'18',color:'333333'},
  h4: {'font-size':'15',color:'333333'},
  p:  {'font-size':'13',color:'555555'},
  list: {'font-size':'12',color:'444444'},
  table: {'font-size':'11'},
  img: {},
  chart: {},
};

function normalizeToTag(ast) {
  var origType = ast.type;

  if (origType === 'toc') {
    convertTocBlocks(ast);
  }

  var mapped = TYPE_MAP[ast.type];
  if (mapped) ast.type = mapped;
  ast.parser = 'tag';

  var isLayout = ast.type === 'stack' || ast.type === 'grid' || ast.type === 'split';
  var isDark = origType === 'title' || origType === 'section' || origType === 'ending';
  var darkColor = isDark ? 'FFFFFF' : null;

  var blocks = ast.content.blocks || [];

  // ── 第一遍：给每个 block 加 tag + style ──
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var t = b.type;
    var d = b.data || {};
    var tag, style;

    if (t === 'heading') {
      tag = 'h' + (d.level || 2);
      style = Object.assign({}, TAG_STYLE[tag] || TAG_STYLE['h2']);
      if (darkColor) style.color = darkColor;
    } else if (t === 'list') {
      tag = 'list'; style = Object.assign({}, TAG_STYLE.list);
      if (darkColor) style.color = darkColor;
    } else if (t === 'paragraph') {
      tag = 'p'; style = Object.assign({}, TAG_STYLE.p);
      if (darkColor) style.color = 'CCCCDD';
    } else if (t === 'table' && ast.type === 'chart') {
      tag = 'chart'; style = Object.assign({}, TAG_STYLE.chart);
      style.chartType = ast.props.chartType || ast.props.type || 'bar';
    } else if (t === 'table') {
      tag = 'table'; style = Object.assign({}, TAG_STYLE.table);
    } else if (t === 'image' || t === 'image-tag') {
      tag = 'img'; style = Object.assign({}, TAG_STYLE.img);
      if (d.label) style.label = d.label;
    } else {
      continue;
    }
    b.tag = tag;
    b.style = style;
  }

  // ── 第二遍：标题去重 ──
  var title = ast.props.title || '';
  if (title && isLayout) {
    for (var i = 0; i < blocks.length; i++) {
      var headingText = blocks[i].data && blocks[i].data.text ? stripFormatting(blocks[i].data.text) : '';
      if (headingText === title && (blocks[i].tag === 'h1' || blocks[i].tag === 'h2')) {
        blocks[i]._skip = true;
        break;
      }
    }
  }

  // ── 第三遍：非布局 slide 自动堆叠坐标 ──
  if (!isLayout && ast.type !== 'chart') {
    var y = 100;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b._skip) continue;
      var s = b.style || {};
      var tag = b.tag || '';
      s.x = '80'; s.y = String(y); s.w = '800';
      if (tag === 'h1')        { s.h = '60'; y += 80; }
      else if (tag === 'h2')   { s.h = '50'; y += 70; }
      else if (tag === 'h3'||tag==='h4') { s.h = '40'; y += 50; }
      else if (tag === 'p')    { s.h = '30'; y += 40; }
      else if (tag === 'list') {
        var count = (b.data && b.data.items) ? b.data.items.length : 1;
        s.h = String(Math.max(40, count * 28));
        y += count * 28 + 20;
      }
      else { y += 50; }
    }
  }
}

// TOC: 所有 heading 转成带编号的有序列表
function convertTocBlocks(ast) {
  var blocks = ast.content.blocks || [];
  var newBlocks = [];
  var tocItems = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.type === 'heading') { tocItems.push(b); }
    else { newBlocks.push(b); }
  }

  if (tocItems.length === 0) return;
  if (!ast.props.title && tocItems[0]) {
    ast.props.title = stripFormatting(tocItems[0].data.text);
  }
  var listItems = [];
  for (var j = 1; j < tocItems.length; j++) {
    listItems.push(AST.createListItem(tocItems[j].data.text));
  }
  if (listItems.length > 0) {
    newBlocks.push(AST.createBlockLegacy('list', AST.createList(true, listItems)));
  }
  ast.content.blocks = newBlocks;
}

module.exports = { normalizeToTag, TYPE_MAP, TAG_STYLE };
