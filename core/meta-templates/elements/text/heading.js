const { esc } = require('../shared/escape');

function render(level, text, style) {
  const s = style || {};
  const fs = s['font-size'] || ({1:32,2:24,3:18,4:15})[level] || 16;
  const tag = 'h' + (level || 2);
  return `<${tag} style="margin:0;font-size:${fs}px;font-weight:${s.bold||level<=2?700:400};color:#${s.color||'333333'};text-align:${s.align||'left'};">${esc(text)}</${tag}>`;
}

module.exports = { render };
