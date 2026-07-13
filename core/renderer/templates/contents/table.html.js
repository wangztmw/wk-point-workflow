/**
 * table.html.js — 数据表格页（经典三线表）
 * 顶级学术/商业刊物的三线表：顶线粗、表头下粗线、底线粗，中间无线，无竖线
 */
function render(ast, config) {
  const { content, props } = ast;
  const table = content.table;
  const title = content.headings[0]?.text || props.title || '数据表';

  if (!table || !table.headers) {
    return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;">
      <div class="section-title">${escapeHTML(title)}</div><div class="divider"></div>
      <p style="color:#999;">（需要表格数据）</p></div>`;
  }

  const isNumCol = table.headers.map((_, ci) => {
    if (ci === 0) return false;
    return table.rows.every(row => !isNaN(parseFloat(row[ci])) && isFinite(row[ci]));
  });

  const headerHTML = table.headers.map((h, ci) =>
    `<th class="${isNumCol[ci] ? 'num' : ''}">${escapeHTML(h)}</th>`
  ).join('');

  const rowsHTML = table.rows.map((row, i) =>
    `<tr class="${i%2===0 ? 'even' : 'odd'}">${row.map((c, ci) =>
      `<td class="${isNumCol[ci] ? 'num' : ''}">${escapeHTML(c)}</td>`
    ).join('')}</tr>`
  ).join('');

  return `<div class="slide slide-table" style="background:var(--color-bg);padding:36px 50px;">
  <div class="section-title" style="margin-bottom:20px;">${escapeHTML(title)}</div>
  <div class="divider" style="margin-bottom:28px;"></div>
  <table class="premium-table">
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
</div>`;
}
function escapeHTML(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
module.exports = { render };
