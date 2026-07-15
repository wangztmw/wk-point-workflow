/**
 * projection.js — AST → SLIDE_DATA 投影规则
 *
 * 定义了每种幻灯片类型从 AST 提取哪些字段、如何转换。
 * 这是 AST → PPT 数据格式的唯一真相源。
 * html-engine 调 PROJECTION[ast.type](ast, utils) 即可得到增量字段。
 *
 * 加新类型：在此文件加一个投影函数即可。
 */

// ============================================================
// 工具函数（外部注入，避免循环依赖）
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
// 投影函数（每种类型一个）
// ============================================================

const { stackPositions, splitPositions, gridPositions } = require('../../templates/layouts/_positions');

/** 为布局 slide 计算精确位置（HTML 和 PPT 共用 _positions.js） */
function layoutBlocks(ast) {
  const blocks = ast.content.blocks || [];
  const t = ast.type;
  const startY = ast.props.title ? 70 : 60;
  if (t === 'stack') return stackPositions(blocks, startY);
  if (t === 'split') return splitPositions(blocks, startY);
  if (t === 'grid')  return gridPositions(blocks, startY);
  return blocks;
}

function projectTag(ast) {
  const rawBlocks = layoutBlocks(ast);
  const blocks = rawBlocks.map(b => {
    let data;
    if (b.tag === 'img') {
      data = { src: b.data.src || '', label: b.data.label || '' };
    } else if (b.tag === 'chart' || b.tag === 'table') {
      data = { headers: b.data.headers, rows: b.data.rows };
    } else if (b.tag === 'p') {
      data = { text: cleanMD(b.data.text || ''), runs: toRuns(b.data.inlineMarkup) };
    } else if (b.tag === 'list') {
      data = {
        ordered: b.data.ordered,
        items: (b.data.items || []).map(item => ({
          text: cleanMD(item.text || ''),
          runs: toRuns(item.inlineMarkup),
        })),
      };
    } else {
      data = b.data;
    }
    return { tag: b.tag, style: b.style, data };
  });
  return { parser: 'tag', blocks };
}

function projectChart(ast) {
  const table = ast.content.table;
  if (!table || !table.headers || table.headers.length < 2) return {};
  const chartType = (ast.props.chartType || ast.props.type || 'bar').toLowerCase();
  const categories = table.rows.map(row => row[0]);
  const series = [];
  for (let col = 1; col < table.headers.length; col++) {
    series.push({ name: table.headers[col], values: table.rows.map(row => parseFloat(row[col]) || 0) });
  }
  return { type: 'chart', chartType, categories, series };
}

function projectTitle(ast) {
  return { subtitle: cleanMD(ast.content.headings[1]?.text || '') };
}

function projectContent(ast) {
  const ordered = [];
  for (const b of (ast.content.blocks || [])) {
    if (b.type === 'heading' && b.data.level >= 3) {
      ordered.push({ kind: 'heading', level: b.data.level, text: cleanMD(b.data.text) });
    } else if (b.type === 'list') {
      for (const item of b.data.items) {
        ordered.push({ kind: 'item', text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
      }
    } else if (b.type === 'paragraph') {
      ordered.push({ kind: 'para', text: cleanMD(b.data.text || ''), runs: toRuns(b.data.inlineMarkup) });
    }
  }
  return { ordered };
}

function projectSummary(ast) {
  const cards = [];
  for (const b of (ast.content.blocks || [])) {
    if (b.type === 'heading' && b.data.level >= 3) {
      cards.push({ title: cleanMD(b.data.text), items: [] });
    } else if (b.type === 'list' && cards.length > 0) {
      for (const item of b.data.items) {
        cards[cards.length - 1].items.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
      }
    }
  }
  return { cards };
}

function projectTwoColumn(ast) {
  const h3s = ast.content.headings.filter(h => h.level >= 3);
  const allItems = [];
  for (const list of ast.content.lists) {
    for (const item of list.items) allItems.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
  }
  const mid = Math.ceil(allItems.length / 2);
  return {
    left:  { title: cleanMD(h3s[0]?.text || '左栏'), items: allItems.slice(0, mid) },
    right: { title: cleanMD(h3s[1]?.text || '右栏'), items: allItems.slice(mid) },
  };
}

function projectThreeColumn(ast) {
  const h3s = ast.content.headings.filter(h => h.level >= 3);
  const allItems = []; for (const list of ast.content.lists) for (const item of list.items) allItems.push(item.text || '');
  const per = Math.ceil(allItems.length / 3);
  const cols = [0,1,2].map(i => ({ title: h3s[i]?.text || '', items: allItems.slice(i*per, (i+1)*per) }));
  return { cols };
}

function projectToc(ast) {
  return { items: ast.content.headings.filter(h => h.level >= 2).map(h => h.text) };
}

function projectSection(ast) {
  return { subtitle: ast.content.headings[1]?.text || '' };
}

function projectTable(ast) {
  const table = ast.content.table;
  return { headers: table ? table.headers : [], rows: table ? table.rows : [] };
}

function projectEnding(ast) {
  return { contact: ast.content.paragraphs.map(p => p.text).join('  |  ') };
}

function projectQuote(ast) {
  const author = ast.content.headings[1]?.text || (ast.content.paragraphs[0]?.text || '');
  return { quote: cleanMD(ast.props.title || ast.content.headings[0]?.text || ''), author };
}

function projectKpiGrid(ast) {
  const table = ast.content.table;
  const kpis = table ? table.rows.slice(0,4).map(r => ({ label: r[0], value: r[1]||'', trend: r[2]||'' })) : [];
  return { kpis };
}

function projectImageText(ast) {
  const items = []; for (const list of ast.content.lists) for (const item of list.items) items.push(item.text || '');
  const imgData = (ast.content.images && ast.content.images[0]) ? ast.content.images[0] : { src: '', label: '' };
  return { items, imgSrc: imgData.src, imgLabel: imgData.label };
}

function projectImageFull(ast) {
  const imgData = (ast.content.images && ast.content.images[0]) ? ast.content.images[0] : { src: '', label: '' };
  return { subtitle: ast.content.headings[1]?.text || '', imgSrc: imgData.src, imgLabel: imgData.label };
}

function projectImageGallery(ast) {
  const images = (ast.content.images || []);
  return { imgSrcs: images.map(img => img.src || ''), labels: images.map(img => img.label || '') };
}

function projectImageGrid(ast) {
  return projectImageGallery(ast); // 同 image-gallery
}

function projectTimeline(ast) {
  const blocks = ast.content.blocks || [];
  const nodes = [];
  let cur = null;
  for (const b of blocks) {
    if (b.type === 'heading' && b.data.level >= 3) {
      if (cur) nodes.push(cur);
      cur = { date: cleanMD(b.data.text), items: [] };
    } else if (b.type === 'list' && cur) {
      for (const item of b.data.items) cur.items.push({ text: cleanMD(item.text || ''), runs: toRuns(item.inlineMarkup) });
    } else if (b.type === 'paragraph' && cur) {
      cur.items.push({ text: cleanMD(b.data.text || ''), runs: toRuns(b.data.inlineMarkup) });
    } else if ((b.type === 'image' || b.type === 'image-tag') && cur) {
      cur.imageSrc = b.data.src || '';
    }
  }
  if (cur) nodes.push(cur);
  return { nodes };
}

// ============================================================
// 主映射表
// ============================================================

const PROJECTION = {
  'tag':            projectTag,
  'chart':          projectChart,
  'title':          projectTitle,
  'content':        projectContent,
  'summary':        projectSummary,
  'two-column':     projectTwoColumn,
  'three-column':   projectThreeColumn,
  'toc':            projectToc,
  'section':        projectSection,
  'table':          projectTable,
  'ending':         projectEnding,
  'quote':          projectQuote,
  'kpi-grid':       projectKpiGrid,
  'image-text':     projectImageText,
  'image-full':     projectImageFull,
  'image-gallery':  projectImageGallery,
  'image-grid':     projectImageGrid,
  'timeline':       projectTimeline,
  'stack':          projectTag,   // 走 blocks 透传
  'grid':           projectTag,
  'split':          projectTag,
};

// ============================================================
// 常数（供引擎导入，不需要在引擎里硬编码）
// ============================================================

/** 需要扫描 images/ 文件夹的幻灯片类型 */
const IMAGE_SLIDE_TYPES = ['image-gallery', 'image-grid', 'image-text', 'image-full'];

/** 使用深色背景的幻灯片类型 */
const DARK_SLIDE_TYPES = ['title', 'section', 'ending'];

// ============================================================
// 导出
// ============================================================

module.exports = {
  PROJECTION,
  IMAGE_SLIDE_TYPES,
  DARK_SLIDE_TYPES,
  // 工具函数也导出，html-engine 需要 cleanMD 和 toRuns 来构建 base.title
  cleanMD,
  toRuns,
};
