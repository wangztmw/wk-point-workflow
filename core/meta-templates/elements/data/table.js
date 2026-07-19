const { esc } = require('../shared/escape');

function render(headers, rows, style) {
  const s = style || {};
  const fs = s['font-size'] || 13;
  if (!headers || headers.length === 0) return '';

  const headerHTML = headers.map(h =>
    `<th style="padding:10px 14px 8px;font-size:${fs}px;color:#1a1a1a;font-weight:700;text-align:center;letter-spacing:0.02em;border-bottom:2px solid #1a1a1a;">${esc(h)}</th>`
  ).join('');

  const dataHTML = (rows || []).map((row, ri) => {
    const bg = ri % 2 === 0 ? '#f9fafb' : '#ffffff';
    return `<tr style="background:${bg};">${row.map(c =>
      `<td style="padding:10px 14px;font-size:${fs-1}px;color:#333;text-align:center;line-height:1.5;">${esc(c)}</td>`
    ).join('')}</tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;border-top:3px solid #1a1a1a;border-bottom:3px solid #1a1a1a;">
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${dataHTML}</tbody>
  </table>`;
}

module.exports = { render };
