/**
 * html-layout.js — HTML 布局统一入口
 *
 * 三个布局函数均接收标准接口 render(ast, config)，
 * 内部调用共享的 blockToEl + 排列逻辑。
 */

const heading = require('../elements/text/heading');
const paragraph = require('../elements/text/paragraph');
const list = require('../elements/text/list');
const image = require('../elements/visual/image');
const box = require('../elements/visual/box');
const table = require('../elements/data/table');
const waterfall = require('../elements/data/waterfall');
const chartShell = require('../elements/data/chart-shell');
const pageTitle = require('../elements/text/page-title');

// ============================================================
// 共享：block → element
// ============================================================

function blockToEl(block) {
  const style = block.style || {};
  const tag = block.tag;
  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4':
      return { tag, render: (s) => heading.render(parseInt(tag[1]), block.data.text, s), style };
    case 'p':
      return { tag, render: (s) => paragraph.render(block.data.text, block.data.inlineMarkup, s), style };
    case 'list':
      return { tag, render: (s) => list.render(block.data.items, block.data.ordered, s), style };
    case 'img':
      return { tag, render: (s) => image.render(block.data.src, block.data.label, s), style };
    case 'box':
      return { tag, render: (s) => box.render(s), style };
    case 'table':
      return { tag, render: (s) => table.render(block.data.headers, block.data.rows, s), style };
    case 'chart': {
      const ct = style.chartType || 'bar';
      return { tag, render: (s) => {
        const rows = (block.data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
        if (ct === 'waterfall') return waterfall.render(rows, '', 'wf_html', s);
        const opt = { tooltip:{}, xAxis:{type:'category',data:rows.map(r=>r.name)}, yAxis:{}, series:[{type:ct,data:rows.map(r=>r.value)}] };
        return chartShell.render('chart_html', opt, s);
      }, style };
    }
    default: return null;
  }
}

// ============================================================
// Stack — 垂直堆叠
// ============================================================

function renderStack(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';
  const elements = [];

  // 不用合并 H3+list — applyLayout 已给每个 block 独立算了 x/y/w/h
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const el = blockToEl(b);
    if (el) elements.push(el);
  }

  // 排列：读布局引擎预计算的位置（英寸→像素 ×96）
  const parts = elements.map(el => {
    var s = el.style || {};
    var pos = {
      x: Math.round((s.x !== undefined ? Number(s.x) : 0.6) * 96) + 'px',
      y: Math.round((s.y !== undefined ? Number(s.y) : 0) * 96) + 'px',
      w: Math.round((s.w !== undefined ? Number(s.w) : 8.8) * 96) + 'px',
      h: Math.round((s.h !== undefined ? Number(s.h) : 0.4) * 96) + 'px',
    };
    var pw = Math.round((s.w !== undefined ? Number(s.w) : 8.8) * 96);
    var ph = Math.round((s.h !== undefined ? Number(s.h) : 0.4) * 96);
    return '<div style="position:absolute;left:' + pos.x + ';top:' + pos.y + ';width:' + pos.w + ';height:' + pos.h + ';overflow:hidden;">'
      + el.render({ x: 0, y: 0, w: pw, h: ph }) + '</div>';
  }).join('\n');

  return `<div class="slide" style="background:var(--color-bg);position:relative;width:960px;height:540px;overflow:hidden;">
    ${title ? `<div style="position:absolute;left:40px;top:20px;">${pageTitle.render(title)}</div>` : ''}
    ${parts}
  </div>`;
}

// ============================================================
// Split — 左右分栏
// ============================================================

function renderSplit(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  const raw = blocks.map(blockToEl).filter(Boolean);

  // 找最优分割点：不拆散 H3+list 对
  let mid = Math.ceil(raw.length / 2);
  for (let tryMid = mid; tryMid > 0; tryMid--) {
    if (raw[tryMid] && raw[tryMid].tag === 'list' && tryMid > 0
        && (raw[tryMid - 1].tag === 'h3' || raw[tryMid - 1].tag === 'h4')) continue;
    mid = tryMid; break;
  }

  const leftEls = raw.slice(0, mid);
  const rightEls = raw.slice(mid);

  const gap = 20;
  const startY = title ? 80 : 24;
  const availW = 920, availH = 540 - startY - 20;
  const leftW = Math.floor(availW * 0.5 - gap / 2);
  const rightW = availW - leftW - gap;

  function colHTML(els, colW, colH) {
    let y = 0;
    // colW/colH 是像素，el.style 是英寸→×96
    return els.map(el => {
      var es = el.style || {};
      var eh = es.h !== undefined ? Math.round(Number(es.h) * 96) : 40;
      var h = Math.min(eh, colH - y);
      var html = el.render({ x: 0, y, w: colW, h: h, 'font-size': es['font-size'], color: es.color, align: es.align });
      y += h + 8;
      return html;
    }).join('');
  }

  return `<div class="slide" style="background:var(--color-bg);padding:${startY}px 20px 20px;">
    ${title ? pageTitle.render(title) : ''}
    <div style="display:flex;gap:${gap}px;${title ? 'margin-top:12px;' : ''}height:${availH}px;">
      <div style="width:${leftW}px;position:relative;overflow:hidden;">${colHTML(leftEls || [], leftW, availH)}</div>
      <div style="width:2px;background:var(--color-border);flex-shrink:0;"></div>
      <div style="width:${rightW}px;position:relative;overflow:hidden;">${colHTML(rightEls || [], rightW, availH)}</div>
    </div>
  </div>`;
}

// ============================================================
// Grid — 网格排列
// ============================================================

function renderGrid(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  const elements = blocks.map(blockToEl).filter(Boolean);
  const n = elements.length;
  const c = n <= 2 ? 2 : (n <= 4 ? 2 : 3);
  const gap = 14;
  const startY = title ? 80 : 24;
  const availW = 880, availH = 540 - startY - 20;
  const cardW = (availW - gap * (c - 1)) / c;
  const cardH = (availH - gap * (Math.ceil(n / c) - 1)) / Math.ceil(n / c);

  const cardsHTML = elements.map(el => {
    var es = el.style || {};
    var eh = es.h !== undefined ? Math.round(Number(es.h) * 96) : cardH;
    var ew = es.w !== undefined ? Math.round(Number(es.w) * 96) : cardW;
    var elStyle = { x: 0, y: 0, w: ew, h: eh, 'font-size': es['font-size'], color: es.color, align: es.align };
    return `<div style="position:relative;width:${cardW}px;height:${cardH}px;overflow:hidden;">${el.render(elStyle)}</div>`;
  }).join('');

  return `<div class="slide" style="background:var(--color-bg);padding:${startY}px 40px 20px;">
    ${title ? pageTitle.render(title) : ''}
    <div style="display:grid;grid-template-columns:repeat(${c},${cardW}px);gap:${gap}px;justify-content:center;${title ? 'margin-top:12px;' : ''}">
      ${cardsHTML}
    </div>
  </div>`;
}

// ============================================================
// 导出
// ============================================================

module.exports = { renderStack, renderSplit, renderGrid };
