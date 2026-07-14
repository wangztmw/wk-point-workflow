/**
 * core/index.js — 统一入口
 *
 * parser/       MD → SlideAST
 * templates/    模板定义（20个模板，设计核心）
 * html-engine/  SlideAST + 模板 → HTML 预览
 * builder/      CLI 构建工具
 * styler/       背景提取模块
 */

const parser = require('./parser');
const htmlEngine = require('./html-engine');

module.exports = {
  parse: parser.parse,
  render: htmlEngine.render,
  DEFAULT_CONFIG: htmlEngine.DEFAULT_CONFIG,
};
