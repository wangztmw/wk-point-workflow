const { esc } = require('../../elements/shared/escape');
/**
 * section.html.js — 过渡页（章节分隔）
 * 大号居中标题，深色背景，用于分隔不同章节
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '';
  const sub = content.headings[1]?.text || props.subtitle || '';

  return `<div class="slide slide-section" style="background:linear-gradient(135deg,${config.theme.primary} 0%,#16213e 100%);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
  <div style="font-size:40px;font-weight:800;letter-spacing:4px;margin-bottom:12px;font-family:var(--font-heading);">${esc(title)}</div>
  ${sub ? `<div style="font-size:18px;opacity:0.7;font-weight:300;">${esc(sub)}</div>` : ''}
  <div style="width:80px;height:3px;background:rgba(255,255,255,0.4);margin-top:28px;border-radius:2px;"></div>
</div>`;
}

module.exports = { render };
