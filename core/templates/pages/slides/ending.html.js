const { esc } = require('../../elements/shared/escape');
/**
 * ending.html.js — 结束页（致谢）
 */
function render(ast, config) {
  const { content, props } = ast;
  const title = content.headings[0]?.text || props.title || '谢谢';
  const sub = content.headings[1]?.text || '';
  const contact = content.paragraphs.map(p => p.text).join('  |  ');

  return `<div class="slide slide-ending" style="background:linear-gradient(135deg,${config.theme.primary} 0%,#764ba2 100%);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
  <div style="font-size:48px;font-weight:800;letter-spacing:3px;margin-bottom:14px;">${esc(title)}</div>
  ${sub ? `<div style="font-size:18px;opacity:0.8;margin-bottom:20px;">${esc(sub)}</div>` : ''}
  ${contact ? `<div style="font-size:14px;opacity:0.6;margin-top:8px;">${esc(contact)}</div>` : ''}
</div>`;
}

module.exports = { render };
