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
  const layoutEngine = require('../../templates/layouts/layout-engine');

  // layout-engine 只导出函数定义，包裹成浏览器可执行代码
  const layoutEngineCode = 'var blockHeight = ' + layoutEngine.blockHeight.toString() + ';\n'
    + 'var itemHeight = ' + layoutEngine.itemHeight.toString() + ';\n'
    + 'var textLines = ' + layoutEngine.textLines.toString() + ';\n'
    + 'var fitChars = ' + layoutEngine.fitChars.toString() + ';\n'
    + 'var truncText = ' + layoutEngine.truncText.toString() + ';\n';

  let code = [core, waterfall, chart, text, table, image, layoutEngineCode, tagexport].join('\n');

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
