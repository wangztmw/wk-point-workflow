/**
 * build-slide-data.js — 从渲染后的 AST 构建 SLIDE_DATA
 *
 * 在 renderBlocks 之后调用，从 blocks 上读取 _ppt + rect 拼成 PPT 引擎所需的纯数据。
 * 替代了旧的 ppt-extract.js（AST→SLIDE_DATA 投影规则）。
 */

// ============================================================
// 工具函数
// ============================================================

function cleanMD(s) { return (s||'').replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/`([^`]+)`/g,'$1'); }

function toRuns(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [{ text: '', options: {} }];
  var runs = [];
  function walk(ns) {
    ns.forEach(function(n) {
      if (n.type === 'text') runs.push({ text: n.value, options: {} });
      else if (n.type === 'bold') { n.content.forEach(function(c) { runs.push({ text: c.value || '', options: { bold: true } }); }); }
      else if (n.type === 'italic') { n.content.forEach(function(c) { runs.push({ text: c.value || '', options: { italic: true } }); }); }
      else if (n.type === 'code') runs.push({ text: n.value, options: { fontFace: 'Courier New', color: '666666' } });
    });
  }
  walk(nodes);
  return runs.length > 0 ? runs : [{ text: '', options: {} }];
}

// ============================================================
// 常数
// ============================================================

/** 需要扫描 images/ 文件夹的幻灯片类型 */
const IMAGE_SLIDE_TYPES = ['image-gallery', 'image-grid', 'image-text', 'image-full'];

/** 使用深色背景的幻灯片类型 */
const DARK_SLIDE_TYPES = ['title', 'section', 'ending'];

// ============================================================
// 主函数：从 AST 构建 SLIDE_DATA 条目
// ============================================================

/**
 * @param {Object} ast — 渲染后的 SlideAST（blocks 已有 _ppt + rect）
 * @returns {Object} SLIDE_DATA 条目
 */
function buildSlideData(ast) {
  var base = {
    index: ast.index,
    type: ast.type,
    title: cleanMD(ast.props.title || (ast.content.headings[0] && ast.content.headings[0].text || '')),
  };

  // Chart 类型：保留专用格式（native-chart.js 需要 chartType + categories + series）
  if (ast.type === 'chart') {
    var table = ast.content.table;
    if (table && table.headers && table.headers.length >= 2) {
      var chartType = (ast.props.chartType || ast.props.type || 'bar').toLowerCase();
      var categories = table.rows.map(function(r) { return r[0]; });
      var series = [];
      for (var col = 1; col < table.headers.length; col++) {
        series.push({ name: table.headers[col], values: table.rows.map(function(r) { return parseFloat(r[col]) || 0; }) });
      }
      return Object.assign(base, { chartType: chartType, categories: categories, series: series });
    }
    return base;
  }

  // 从 blocks 上读取 _ppt + rect，跳过 _skip 标记的
  var blocks = (ast.content.blocks || []).filter(function(b) { return !b._skip; }).map(function(b) {
    var tag = b.tag;
    var data;
    if (tag === 'img') {
      data = { src: b.data.src || '', label: b.data.label || '' };
    } else if (tag === 'chart' || tag === 'table') {
      data = { headers: b.data.headers, rows: b.data.rows };
    } else if (tag === 'p') {
      data = { text: cleanMD(b.data.text || ''), runs: toRuns(b.data.inlineMarkup) };
    } else if (tag === 'list') {
      data = {
        ordered: b.data.ordered,
        items: (b.data.items || []).map(function(item) {
          return { text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) };
        }),
      };
    } else {
      data = b.data;
    }
    return { tag: tag, style: b.style, data: data, _ppt: b._ppt, rect: b.rect };
  });

  return Object.assign(base, { parser: 'tag', blocks: blocks });
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  buildSlideData,
  IMAGE_SLIDE_TYPES,
  DARK_SLIDE_TYPES,
  cleanMD,
};
