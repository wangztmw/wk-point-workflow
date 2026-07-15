/**
 * table.js — 表格元素
 * render(headers, rows, style) → 三线表或简易表
 */
const { esc } = require('../shared/escape');
const { styleToHtml } = require('../../../utils/coordinates');

function render(headers, rows, style) {
  const s = style || {};
  const pos = styleToHtml(s);
  const fs = s['font-size'] || 11;
  const variant = s.variant || 'simple';

  if (!headers || headers.length === 0) return '';

  if (variant === 'premium') {
    const headerRow = `<tr>${headers.map(h =>
      `<th style="border-bottom:2px solid #1a1a1a;padding:4px 8px;font-size:${fs}px;color:#333;font-weight:600;">${esc(h)}</th>`
    ).join('')}</tr>`;
    const dataRows = (rows || []).map((row, ri) =>
      `<tr>${row.map(c =>
        `<td style="border-bottom:1px solid #e0e0e0;padding:4px 8px;font-size:${fs-1}px;color:#555;">${esc(c)}</td>`
      ).join('')}</tr>`
    ).join('');
    return `<div style="${pos};overflow:auto;">
      <table style="width:100%;border-collapse:collapse;font-family:inherit;border-top:2px solid #1a1a1a;border-bottom:2px solid #1a1a1a;"><thead>${headerRow}</thead><tbody>${dataRows}</tbody></table>
    </div>`;
  }

  // simple
  const headerRow = `<tr>${headers.map(h =>
    `<th style="border-bottom:1px solid #ddd;padding:3px 8px;font-size:${fs}px;color:#333;">${esc(h)}</th>`
  ).join('')}</tr>`;
  const dataRows = (rows || []).map(row =>
    `<tr>${row.map(c =>
      `<td style="padding:3px 8px;font-size:${fs-1}px;color:#666;">${esc(c)}</td>`
    ).join('')}</tr>`
  ).join('');

  return `<div style="${pos};overflow:auto;">
    <table style="width:100%;border-collapse:collapse;font-family:inherit;">${headerRow}${dataRows}</table>
  </div>`;
}

module.exports = { render };
