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

/** 估算文本行数（考虑字号、容器宽度、文本长度） */
function estLines(text, boxW, fontSize) {
  if (!text) return 1;
  // 中文字符宽度 ≈ fontSize，英文≈0.5*fontSize，加权≈0.7
  const cpl = Math.max(1, Math.floor((boxW || 840) / (fontSize * 0.7)));
  // 去掉 inline markup 标记估算纯文本长度
  const clean = String(text).replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
  return Math.ceil(clean.length / cpl);
}

/** 估算 block 渲染高度（px），考虑文本实际体积 */
function blockHeight(b, boxW) {
  const w = boxW || 840;
  const tag = b.tag;
  const s = b.style || {};
  if (tag === 'h1')       return Math.max(36, (Number(s['font-size'])||32) * 1.3);
  if (tag === 'h2')       return Math.max(30, (Number(s['font-size'])||24) * 1.3);
  if (tag === 'h3' || tag === 'h4') {
    return Math.max(24, (Number(s['font-size'])||16) * 1.3);
  }
  if (tag === 'p') {
    const fs = Number(s['font-size']) || 13;
    const text = b.data?.text || '';
    return Math.max(28, estLines(text, w, fs) * fs * 1.6 + 4);
  }
  if (tag === 'list') {
    const fs = Number(s['font-size']) || 12;
    const items = b.data?.items || [];
    let totalH = 0;
    items.forEach(item => {
      const t = typeof item === 'string' ? item : (item.text || '');
      totalH += Math.max(18, estLines(t, w - 20, fs) * fs * 1.6);
    });
    return Math.max(items.length * 20, totalH + 4);
  }
  if (tag === 'img')      return 120;
  if (tag === 'table')    return Math.max(((b.data?.rows || []).length + 1) * 22, 80);
  if (tag === 'chart')    return 320;
  if (tag === 'box')      return Number(s.h) || 4;
  return 40;
}

/** blockHeight 的默认宽度版本（供 split/grid 使用） */
function bh(b) { return blockHeight(b, 420); }

/** 为布局类 slide（stack/grid/split）计算默认位置 */
function layoutBlocks(ast) {
  const blocks = ast.content.blocks || [];
  const t = ast.type;
  if (t !== 'stack' && t !== 'grid' && t !== 'split') return blocks;

  const DPI = 96;
  const titleH = ast.props.title ? 50 : 0;  // 标题栏高度
  let y = titleH + 10;
  const gap = 8;

  if (t === 'grid') {
    const n = blocks.length;
    const cols = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
    const cardW = 850 / cols;
    // 每张卡片高度根据内容估算
    const cardHeights = blocks.map(b => bh(b));
    const rows = Math.ceil(n / cols);
    // 每行取该行最高卡片
    const rowHeights = [];
    for (let r = 0; r < rows; r++) {
      let maxH = 0;
      for (let c = 0; c < cols && r*cols+c < n; c++) {
        maxH = Math.max(maxH, cardHeights[r*cols+c] || 100);
      }
      rowHeights.push(maxH + 16);
    }
    let yPos = titleH + 10;
    const result = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols && r*cols+c < n; c++) {
        const i = r*cols + c;
        result.push({ ...blocks[i], style: { ...(blocks[i].style||{}), x: 50 + c*(cardW+15), y: yPos, w: cardW, h: rowHeights[r] - 16 } });
      }
      yPos += rowHeights[r];
    }
    return result;
  }
  if (t === 'split') {
    // 找最优分割点：不拆散 H3+list 对（对齐 split-slide.js 逻辑）
    const nBlocks = blocks.length;
    let mid = Math.ceil(nBlocks / 2);
    for (let tryMid = mid; tryMid > 0; tryMid--) {
      const prev = blocks[tryMid - 1];
      const cur = blocks[tryMid];
      if (cur && cur.tag === 'list' && prev && (prev.tag === 'h3' || prev.tag === 'h4')) {
        continue; // 会拆散 H3+list → 往前找
      }
      mid = tryMid; break;
    }
    const leftBs = blocks.slice(0, mid);
    const rightBs = blocks.slice(mid);
    const result = [];
    let lY = titleH + 10, rY = titleH + 10;
    leftBs.forEach((b) => {
      const h = bh(b);
      result.push({ ...b, style: { ...(b.style||{}), x: 50, y: lY, w: 420, h: h } });
      lY += h + 8;
    });
    rightBs.forEach((b) => {
      const h = bh(b);
      result.push({ ...b, style: { ...(b.style||{}), x: 500, y: rY, w: 420, h: h } });
      rY += h + 8;
    });
    return result;
  }
  // stack: 垂直堆叠
  return blocks.map(b => {
    const h = blockHeight(b);
    const pos = { ...(b.style||{}), x: 60, y: y, w: 840, h: h };
    y += h + gap;
    return { ...b, style: pos };
  });
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
