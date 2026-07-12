/**
 * two-column.html.js — 两栏布局模板
 *
 * 将内容分为左右两栏。
 * 第一个 H3 + 其内容 = 左栏，第二个 H3 + 其内容 = 右栏。
 * 每栏包含标题、列表和段落。
 *
 * Markdown 示例：
 *   <!-- slide: two-column -->
 *   ## 优势与挑战
 *   ### 竞争优势
 *   - 技术壁垒高
 *   ### 面临挑战
 *   - 市场竞争激烈
 */

function render(ast, config) {
  const { content, props } = ast;

  const title = content.headings[0]?.text || props.title || '';

  // 将 h3 分组为左右两栏
  const h3Headings = content.headings.filter(h => h.level >= 3);
  const leftTitle = h3Headings[0]?.text || '左栏';
  const rightTitle = h3Headings[1]?.text || '右栏';

  // 收集所有列表项（前一半归左栏，后一半归右栏）
  const allItems = [];
  for (const list of content.lists) {
    for (const item of list.items) {
      allItems.push(renderInlinePlain(item.inlineMarkup));
    }
  }

  // 收集所有段落
  const allParas = content.paragraphs.map(p => renderInlinePlain(p.inlineMarkup));

  // 将列表项平分到两栏
  const mid = Math.ceil(allItems.length / 2);
  const leftItems = allItems.slice(0, mid);
  const rightItems = allItems.slice(mid);

  // 将段落平分
  const paraMid = Math.ceil(allParas.length / 2);
  const leftParas = allParas.slice(0, paraMid);
  const rightParas = allParas.slice(paraMid);

  function buildColumn(colTitle, items, paras, isLeft) {
    const borderColor = isLeft ? 'var(--color-primary)' : 'var(--color-accent)';
    return `
    <div class="column-card" style="border-left: 4px solid ${borderColor}; flex: 1; padding: 16px 20px; background: var(--color-bg-alt); border-radius: 0 var(--radius-md) var(--radius-md) 0;">
      <h4 style="font-size: 18px; font-weight: 700; color: #333; margin-bottom: 10px;">${escapeHTML(colTitle)}</h4>
      ${items.length > 0 ? `<ul class="col-list">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
      ${paras.map(p => `<p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 6px;">${escapeHTML(p)}</p>`).join('')}
    </div>`;
  }

  return `
<div class="slide slide-two-col" style="background: var(--color-bg); padding: 40px 44px;">
  ${title ? `<div class="section-title" style="margin-bottom: 16px;">${escapeHTML(title)}</div>` : ''}
  <div class="two-col-row" style="display: flex; gap: 20px; flex: 1; min-height: 0;">
    ${buildColumn(leftTitle, leftItems, leftParas, true)}
    ${rightItems.length > 0 || rightParas.length > 0 ? buildColumn(rightTitle, rightItems, rightParas, false) : ''}
  </div>
</div>`;
}

function renderInlinePlain(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  return nodes.map(n => {
    if (n.type === 'text') return n.value;
    if (n.type === 'bold') return renderInlinePlain(n.content);
    if (n.type === 'italic') return renderInlinePlain(n.content);
    if (n.type === 'code') return n.value;
    return '';
  }).join('');
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { render };
