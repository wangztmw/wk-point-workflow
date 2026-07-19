const { esc } = require('../shared/escape');

function render(src, label, style) {
  const hasImage = src && src.length > 100;
  if (hasImage) {
    return `<img src="${esc(src)}" style="max-width:100%;" alt="${esc(label||'')}">`;
  }
  return `<span style="display:inline-block;padding:8px 16px;border:2px dashed #ddd;background:#fafafa;font-weight:600;color:#999;font-size:14px;">${esc(label||'')}</span>`;
}

module.exports = { render };
