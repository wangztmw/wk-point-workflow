/**
 * ppt-engine/script.js — 导出脚本生成器
 *
 * 从 6 个 .js 模块读取 PptxGenJS 导出函数源码，
 * 拼接 + 占位符替换后包裹为 <script> 块。
 * ppt-engine 是导出逻辑的唯一真相源。
 */

function generate(params) {
  // 按顺序加载各模块的函数代码
  const core    = require('./core');
  const waterfall = require('./waterfall');
  const chart   = require('./native-chart');
  const text    = require('./text-layout');
  const table   = require('./table');
  const image   = require('./image');
  const tagexport = require('./tag-export');
  const { pptHeading, pptParagraph, pptList, pptTable, pptImage, pptBox, pptChart } = require('../types/element-registry');

  // 浏览器端工具函数 + 元素注册表
  const engineUtils = `
var textLines=function(t,w,f){if(!t||!w||!f)return 1;var c=Math.floor(w*96/(f*1.0));if(c<1)c=1;return Math.ceil(String(t).length/c);};
var itemHeight=function(t,w,f){var l=textLines(t,w,f||12);return Math.max(0.28,l*(f||12)/96*2.0+0.04);};
var fitChars=function(bW,bH,f,lh){var c=Math.floor((bW||8.5)*96/(f||13)/0.7);var m=Math.max(1,Math.floor((bH||0.4)*96/((f||13)*(lh||1.6))));return{cpl:c,maxLines:m,total:c*m};};
var truncText=function(t,m){if(!t||t.length<=m)return t;return t.slice(0,m-1).replace(/\\s+$/,'')+'…';};
var REGISTRY={h1:{ppt:${pptHeading.toString()}},h2:{ppt:${pptHeading.toString()}},h3:{ppt:${pptHeading.toString()}},h4:{ppt:${pptHeading.toString()}},p:{ppt:${pptParagraph.toString()}},list:{ppt:${pptList.toString()}},table:{ppt:${pptTable.toString()}},img:{ppt:${pptImage.toString()}},box:{ppt:${pptBox.toString()}},chart:{ppt:${pptChart.toString()}}};
`;

  let code = [core, waterfall, chart, text, table, image, engineUtils, tagexport].join('\n');

  // 占位符替换（browser-code.txt 中残留的）
  code = code.replace(/__SLIDE_DATA__/g, params.slideDataJSON);
  code = code.replace(/__CHART_DATA__/g, params.chartDataJSON);
  code = code.replace(/__COLORS__/g, params.colorsJSON);
  code = code.replace(/__BACKGROUND__/g, params.backgroundJSON);
  code = code.replace(/__SLIDE_COUNT__/g, String(params.slideCount));
  code = code.replace(/__TITLE__/g, params.title);
  code = code.replace(/__SVG_VECTOR__/g, String(params.svgAsVector));
  code = code.replace(/__EMBED_FONTS__/g, String(params.autoEmbedFonts));
  code = code.replace(/__CHART_COUNT__/g, String(params.chartSlidesLen));
  code = code.replace(/__CHART_COUNT_VAL__/g, String(params.chartSlidesLen));
  code = code.replace(/__DARK_TYPES__/g, params.darkTypesJSON || '[]');

  return '<script>\n' + code + '\n</script>';
}

module.exports = { generate };
