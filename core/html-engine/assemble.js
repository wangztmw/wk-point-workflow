/**
 * assemble.js — HTML 输出编排中心
 *
 * 调度 render → images → document 三个模块，组装最终 HTML。
 * 对应 ppt-engine/assemble.js 的角色。
 */

const { mergeConfig } = require('./config');
const { resolveImages } = require('./images');
const { buildDocument } = require('./document');

/**
 * 主入口：SlideAST[] + config → 完整 HTML 字符串
 */
function render(slides, userConfig) {
  const config = mergeConfig(userConfig || {});

  // ① 布局预计算 + 统一渲染
  const { process } = require('../layout/assemble');
  const { renderAll } = require('../render/assemble');
  for (const ast of slides) {
    process(ast);
    renderAll(ast, config);
  }

  // ② 图片文件夹解析
  const projectDir = config.projectDir || null;
  for (const ast of slides) {
    resolveImages(ast, projectDir);
  }

  // ③ 拼装 HTML 字符串
  const slidesHTML = slides.map(ast => ast._html || '').join('\n');

  // ④ 最终文档
  return buildDocument({
    title: config.title,
    slidesHTML,
    slides,
    config,
  });
}

module.exports = { render };
