/**
 * element-registry.js — 元素级注册表
 *
 * tag → {html, ppt} 渲染函数对。
 * HTML 端：require 元素模板 + REGISTRY 查表（被 render.js 使用）
 * PPT  端：_ppt 描述符已由 render.js 在 Node 端生成，浏览器端由 executeBlock 执行
 */

// HTML 端：require 元素模块
const heading  = require('../../templates/elements/text/heading');
const paragraph = require('../../templates/elements/text/paragraph');
const list      = require('../../templates/elements/text/list');
const image     = require('../../templates/elements/visual/image');
const box       = require('../../templates/elements/visual/box');
const tableEl   = require('../../templates/elements/data/table');
const waterfall = require('../../templates/elements/data/waterfall');
const chartShell = require('../../templates/elements/data/chart-shell');

// tag → {html} 注册表
const REGISTRY = {
  h1: {}, h2: {}, h3: {}, h4: {},
  p: {}, list: {}, table: {}, img: {}, box: {}, chart: {},
};

// HTML 端：tag → 渲染函数（render.js 使用这些绑定来构建 block._html）
REGISTRY.h1.html = (data, style) => heading.render(1, data.text, style);
REGISTRY.h2.html = (data, style) => heading.render(2, data.text, style);
REGISTRY.h3.html = (data, style) => heading.render(3, data.text, style);
REGISTRY.h4.html = (data, style) => heading.render(4, data.text, style);
REGISTRY.p.html   = (data, style) => paragraph.render(data.text, data.runs ? {type:'paragraph', inlineMarkup:[]} : null, style);
REGISTRY.list.html = (data, style) => list.render(data.items, data.ordered, style);
REGISTRY.table.html = (data, style) => tableEl.render(data.headers, data.rows, style);
REGISTRY.img.html = (data, style) => image.render(data.src, data.label, style);
REGISTRY.box.html = (data, style) => box.render(style);
REGISTRY.chart.html = (data, style) => {
  var ct = (style.chartType || 'bar').toLowerCase();
  var rows = (data.rows || []).map(r => ({ name: r[0], value: parseFloat(r[1]) || 0 }));
  if (ct === 'waterfall' || ct === 'waterfall2') return waterfall.render(rows, '', 'chart_reg', style);
  var opt = { tooltip:{}, xAxis:{type:'category',data:rows.map(r=>r.name)}, yAxis:{}, series:[{type:ct,data:rows.map(r=>r.value)}] };
  return chartShell.render('chart_reg', opt, style);
};

module.exports = { REGISTRY };
