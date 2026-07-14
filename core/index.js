/**
 * core/index.js — 统一入口
 *
 * parser/     Markdown → SlideAST
 * renderer/   SlideAST → HTML + 浏览器导出引擎（含模板）
 * builder/    CLI 构建工具
 * styler/     背景提取模块
 */

const parser = require('./parser');
const renderer = require('./renderer');

module.exports = {
  parse: parser.parse,
  render: renderer.render,
  DEFAULT_CONFIG: renderer.DEFAULT_CONFIG,
};
