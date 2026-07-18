/**
 * tag-renderer.js — 标签语法通用渲染器
 *
 * 对 tag 解析的幻灯片，所有元素按 style 中的 x/y/w/h 绝对定位。
 * block._html(style) 已由 render.js 预绑定，不再需要 switch tag 或调元素模板。
 */

const { styleToHtml, styleToFontProps } = require('../core/utils/coordinates');

function render(ast, config) {
  const { content } = ast;
  const blocks = content.blocks || [];

  // 幻灯片级背景
  const slideType = ast.type;
  const theme = ast.props.theme || '';
  const isDarkSlide = slideType === 'title' || slideType === 'section' || slideType === 'ending';
  let slideBg = 'var(--color-bg)';
  if (isDarkSlide) {
    slideBg = '#1a1a2e';
    if (theme === 'gradient') {
      slideBg = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  const elements = blocks.map(function(block) {
    if (!block._html) return '';
    // 非布局 slide 的 style 已是像素，直接传入
    return block._html(block.style || {});
  }).filter(Boolean).join('\n');

  return '<div class="slide slide-tag" style="background:' + slideBg + ';position:relative;width:960px;height:540px;overflow:hidden;">'
    + elements
    + '</div>';
}

module.exports = { render };
