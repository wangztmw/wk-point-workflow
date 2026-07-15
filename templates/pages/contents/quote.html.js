const { esc } = require('../../elements/shared/escape');
/**
 * quote.html.js — 引用页
 * h2 = 引用文字，h3 = 出处
 */
function render(ast, config) {
  const { content, props } = ast;
  const quote = content.headings[0]?.text || props.title || '';
  const author = content.headings[1]?.text || content.paragraphs[0]?.text || '';

  return `<div class="slide slide-quote" style="background:var(--color-bg-alt);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px 80px;">
  <div style="font-size:60px;color:var(--color-primary);opacity:0.3;line-height:1;margin-bottom:-10px;">"</div>
  <div style="font-size:26px;font-weight:500;color:#333;line-height:1.6;max-width:700px;font-family:var(--font-heading);">${esc(quote)}</div>
  ${author ? `<div style="font-size:16px;color:#888;margin-top:24px;">— ${esc(author)}</div>` : ''}
  <div style="width:50px;height:2px;background:var(--color-primary);opacity:0.3;margin-top:20px;border-radius:1px;"></div>
</div>`;
}

module.exports = { render };
