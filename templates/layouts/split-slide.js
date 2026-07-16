/**
 * split-slide.js — 左右分栏布局的 AST 适配层
 * 按中点分割 blocks，保证 H3+list 不跨栏。
 */
const split = require('./split');
const heading = require('../elements/text/heading');
const paragraph = require('../elements/text/paragraph');
const list = require('../elements/text/list');
const image = require('../elements/visual/image');
const box = require('../elements/visual/box');
const table = require('../elements/data/table');
const waterfall = require('../elements/data/waterfall');

function render(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

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
          return ct === 'waterfall' ? waterfall.render(rows, '', 'wf_split', s) : `<div style="color:#999;text-align:center;">图表</div>`;
        }, style };
      }
      default: return null;
    }
  }

  const raw = blocks.map(blockToEl).filter(Boolean);

  // 找最优分割点：不拆散 H3+list 对
  let mid = Math.ceil(raw.length / 2);
  for (let tryMid = mid; tryMid > 0; tryMid--) {
    if (raw[tryMid] && raw[tryMid].tag === 'list' && tryMid > 0 && (raw[tryMid-1].tag === 'h3' || raw[tryMid-1].tag === 'h4')) {
      continue; // 会拆散 H3+list → 往前找
    }
    mid = tryMid; break;
  }

  const leftEls = raw.slice(0, mid);
  const rightEls = raw.slice(mid);

  return split.render(leftEls, rightEls, title, 0.5, { ...config });
}

module.exports = { render };
