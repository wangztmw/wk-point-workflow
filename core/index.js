/**
 * core/index.js — 统一入口
 *
 * 技术层模块化引擎，每个功能节点独立一个文件夹：
 *   parser/     Markdown → SlideAST
 *   renderer/   SlideAST → HTML（含模板）
 *   exporter/   SlideAST → PPTX（含导出策略）
 *   builder/    CLI 构建工具
 */

const parser = require('./parser');
const renderer = require('./renderer');
const exporter = require('./exporter');

module.exports = {
  parse: parser.parse,
  render: renderer.render,
  exportToFile: exporter.exportToFile,
  buildNativePPTX: exporter.buildNativePPTX,
  DEFAULT_CONFIG: renderer.DEFAULT_CONFIG,
};
