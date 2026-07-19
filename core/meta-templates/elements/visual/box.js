function render(style) {
  const s = style || {};
  const fill = s['fill-color'] ? `background:#${s['fill-color']};` : '';
  const bd = s['border-color'] ? `border:${s['border-width']||1}px solid #${s['border-color']};` : '';
  const br = s['border-radius'] ? `border-radius:${s['border-radius']}px;` : '';
  return `<div style="${fill}${bd}${br}"></div>`;
}

module.exports = { render };
