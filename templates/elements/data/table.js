/**
 * table.js — 表格元素
 * render(headers, rows, style) → 三线表（默认 premium 风格）
 */
const { esc } = require('../shared/escape');
const { styleToHtml } = require('../../../core/utils/coordinates');

function render(headers, rows, style) {
  const s = style || {};
  const fs = s['font-size'] || 13;
  if (!headers || headers.length === 0) return '';

  // 三线表：顶线3px + 表头下线2px + 底线3px，隔行换色
  const headerHTML = headers.map(h =>
    `<th style="padding:10px 14px 8px;font-size:${fs}px;color:#1a1a1a;font-weight:700;text-align:center;letter-spacing:0.02em;border-bottom:2px solid #1a1a1a;">${esc(h)}</th>`
  ).join('');

  const dataHTML = (rows || []).map((row, ri) => {
    const bg = ri % 2 === 0 ? '#f9fafb' : '#ffffff';
    return `<tr style="background:${bg};">${row.map(c =>
      `<td style="padding:10px 14px;font-size:${fs-1}px;color:#333;text-align:center;line-height:1.5;">${esc(c)}</td>`
    ).join('')}</tr>`;
  }).join('');

  const tableHTML = `<table style="width:100%;border-collapse:collapse;font-family:inherit;border-top:3px solid #1a1a1a;border-bottom:3px solid #1a1a1a;">
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${dataHTML}</tbody>
  </table>`;

  const hasPos = s.x !== undefined || s.y !== undefined || s.w !== undefined || s.h !== undefined;
  if (!hasPos) return tableHTML;
  const pos = styleToHtml(s);
  return `<div style="${pos};overflow:auto;">${tableHTML}</div>`;
}

module.exports = { render };
