const { esc } = require('../../elements/shared/escape');
/**
 * kpi-grid.html.js — KPI概览页（2×2 田字格大数字卡片）
 * 表格数据 → 4个KPI卡片，大数字 + 指标名
 */
function render(ast, config) {
  const { content, props } = ast;
  const table = content.table;
  const title = content.headings[0]?.text || props.title || '核心指标';

  if (!table || !table.rows || table.rows.length < 4) {
    return `<div class="slide slide-content" style="background:var(--color-bg);padding:50px 70px;">
      <div class="section-title">${esc(title)}</div><div class="divider"></div>
      <p style="color:#999;">（需要4行数据来生成KPI概览：指标名 | 数值）</p></div>`;
  }

  const items = table.rows.slice(0, 4).map((row, i) => ({
    label: row[0],
    value: row[1] || '—',
    trend: row[2] || '',
  }));

  const colors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-success)', 'var(--color-warning)'];
  const cardsHTML = items.map((item, i) => `
    <div style="flex:1;background:var(--color-bg-alt);padding:28px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      <div style="width:40px;height:4px;background:${colors[i]};margin-bottom:16px;border-radius:2px;"></div>
      <div style="font-size:36px;font-weight:800;color:#1a1a1a;line-height:1.1;font-family:'SF Mono','JetBrains Mono',monospace;">${esc(item.value)}</div>
      <div style="font-size:13px;color:#888;margin-top:8px;">${esc(item.label)}</div>
      ${item.trend ? `<div style="font-size:12px;color:${item.trend.startsWith('+')||item.trend.startsWith('↑')?'#16A34A':'#DC2626'};margin-top:4px;font-weight:600;">${esc(item.trend)}</div>` : ''}
    </div>
  `).join('');

  return `<div class="slide slide-kpi" style="background:var(--color-bg);padding:36px 44px;">
  <div class="section-title" style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${esc(title)}</div>
  <div class="divider"></div>
  <div style="display:flex;gap:16px;margin-top:16px;flex:1;min-height:0;">${cardsHTML}</div>
</div>`;
}

module.exports = { render };
