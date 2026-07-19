/**
 * ppt-engine/script.js — 导出脚本生成器
 *
 * 从 6 个 .js 模块读取 PptxGenJS 导出函数源码，
 * 拼接 + 占位符替换后包裹为 <script> 块。
 * ppt* 函数已移除 — 渲染逻辑集中在 render.js（Node 端）+ executeBlock（浏览器端）。
 */

function generate(params) {
  const init        = require('./init');
  const waterfall   = require('./ppt-graph/waterfall');
  const chart       = require('./ppt-graph/native-chart');
  const engineUtils = require('./engine-utils');
  const tagexport   = require('./base/tag-export');
  const exportFn    = require('./export');

  let code = [init, waterfall, chart, engineUtils, tagexport, exportFn].join('\n');

  // 占位符替换
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
