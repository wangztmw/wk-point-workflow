/**
 * stack-slide.js — 垂直堆叠布局的 AST 适配层
 * 相邻 heading+内容块组成"段"，段内紧凑、段间留白。
 */
const stack = require('./stack');
const heading = require('../elements/text/heading');
const paragraph = require('../elements/text/paragraph');
const list = require('../elements/text/list');
const image = require('../elements/visual/image');
const box = require('../elements/visual/box');
const table = require('../elements/data/table');
const waterfall = require('../elements/data/waterfall');
const chartShell = require('../elements/data/chart-shell');

function render(ast, config) {
  const blocks = ast.content.blocks || [];
  const title = ast.props.title || '';

  // 将相邻 heading+列表合并为"段"元素
  const elements = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    const tag = b.tag;
    const style = b.style || {};

    // H3/H4 标题后紧跟 list → 合并为一段
    if ((tag === 'h3' || tag === 'h4') && i + 1 < blocks.length && blocks[i+1].tag === 'list') {
      const hBlock = b;
      const listBlock = blocks[i+1];
      elements.push({
        render: (s) => {
          const hStyle = { ...s, h: 22 };
          const lStyle = { ...s, y: (s.y||0) + 20, h: s.h - 20 };
          return heading.render(parseInt(hBlock.tag[1]), hBlock.data.text, hStyle)
               + list.render(listBlock.data.items, listBlock.data.ordered, lStyle);
        },
        style: { h: 60 + (listBlock.data.items.length * 16) },
      });
      i += 2;
      continue;
    }

    // H3/H4 标题后紧跟 p → 合并
    if ((tag === 'h3' || tag === 'h4') && i + 1 < blocks.length && blocks[i+1].tag === 'p') {
      const hBlock = b;
      const pBlock = blocks[i+1];
      elements.push({
        render: (s) => {
          const hStyle = { ...s, h: 22 };
          const pStyle = { ...s, y: (s.y||0) + 20, h: s.h - 20 };
          return heading.render(parseInt(hBlock.tag[1]), hBlock.data.text, hStyle)
               + paragraph.render(pBlock.data.text, pBlock.data.inlineMarkup, pStyle);
        },
        style: { h: 50 },
      });
      i += 2;
      continue;
    }

    // 标准单块
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4':
        elements.push({ render: (s) => heading.render(parseInt(tag[1]), b.data.text, s), style: { h: 30, ...style } });
        break;
      case 'p':
        elements.push({ render: (s) => paragraph.render(b.data.text, b.data.inlineMarkup, s), style: { h: 28, ...style } });
        break;
      case 'list':
        elements.push({ render: (s) => list.render(b.data.items, b.data.ordered, s), style: { h: b.data.items.length * 22, ...style } });
        break;
      case 'img':
        elements.push({ render: (s) => image.render(b.data.src, b.data.label, s), style: { h: 120, ...style } });
        break;
      case 'box':
        elements.push({ render: (s) => box.render(s), style });
        break;
      case 'table':
        elements.push({ render: (s) => table.render(b.data.headers, b.data.rows, s), style: { h: (b.data.rows.length+1)*22, ...style } });
        break;
      case 'chart': {
        const ct = style.chartType || 'bar';
        elements.push({ render: (s) => {
          const rows = (b.data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
          if (ct === 'waterfall') return waterfall.render(rows, '', 'wf_stack', s);
          const opt = { tooltip:{}, xAxis:{type:'category',data:rows.map(r=>r.name)}, yAxis:{}, series:[{type:ct,data:rows.map(r=>r.value)}] };
          return chartShell.render('chart_stack', opt, s);
        }, style: { h: 320, ...style } });
        break;
      }
    }
    i++;
  }

  return stack.render(elements, title, { ...config, slideIndex: ast.index });
}

module.exports = { render };
