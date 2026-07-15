/**
 * grid-slide.js — 网格布局的 AST 适配层
 */
const grid = require('./grid');
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

  const elements = blocks.map(block => {
    const style = block.style || {};
    switch (block.tag) {
      case 'h1': case 'h2': case 'h3': case 'h4':
        return { render: (s) => heading.render(parseInt(block.tag[1]), block.data.text, s), style };
      case 'p':
        return { render: (s) => paragraph.render(block.data.text, block.data.inlineMarkup, s), style };
      case 'list':
        return { render: (s) => list.render(block.data.items, block.data.ordered, s), style };
      case 'img':
        return { render: (s) => image.render(block.data.src, block.data.label, s), style };
      case 'box':
        return { render: (s) => box.render(s), style };
      case 'table':
        return { render: (s) => table.render(block.data.headers, block.data.rows, s), style };
      case 'chart': {
        const ct = style.chartType || 'bar';
        return { render: (s) => {
          const rows = (block.data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
          return ct === 'waterfall' ? waterfall.render(rows, '', 'wf_grid', s) : `<div style="color:#999;text-align:center;">图表</div>`;
        }, style };
      }
      default: return null;
    }
  }).filter(Boolean);

  return grid.render(elements, 0, title, config);
}

module.exports = { render };
