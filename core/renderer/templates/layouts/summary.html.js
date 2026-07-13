/**
 * summary.html.js — 总结/卡片页模板
 *
 * 将 Markdown 中的 H3 标题渲染为卡片，列表作为卡片内容。
 * 自动排列为 2-3 列网格布局。
 *
 * Markdown 示例：
 *   ## 📋 核心结论
 *   ### ✅ 达成目标
 *   - 营收超预期
 *   - 用户增长健康
 *   ### ⚠️ 需要关注
 *   - 客服响应时间延长
 */

function render(ast, config) {
  const { content, props } = ast;

  const title = content.headings[0]?.text || props.title || '总结';

  // 将内容组织为卡片：每个 h3 是一个卡片
  const cards = [];
  let currentCard = null;

  // 收集 h3+ 标题和其后的列表/段落
  for (const heading of content.headings) {
    if (heading.level >= 3) {
      if (currentCard) cards.push(currentCard);
      currentCard = {
        title: heading.text,
        items: [],
        paragraphs: [],
      };
    }
  }

  // 收集列表项到当前卡片
  for (const list of content.lists) {
    for (const item of list.items) {
      const text = renderInlinePlain(item.inlineMarkup);
      if (currentCard) {
        currentCard.items.push(text);
      } else {
        // 没有卡片标题时，创建一个默认的
        if (!currentCard) {
          currentCard = { title: '', items: [], paragraphs: [] };
        }
        currentCard.items.push(text);
      }
    }
  }

  // 收集段落到当前卡片
  for (const p of content.paragraphs) {
    const text = renderInlinePlain(p.inlineMarkup);
    if (currentCard) {
      currentCard.paragraphs.push(text);
    }
  }

  if (currentCard) cards.push(currentCard);

  // 如果没有解析到卡片，从 headings 和 lists 中推断
  if (cards.length === 0) {
    // 尝试把 h2 以下的内容做成卡片
    const subHeadings = content.headings.filter(h => h.level >= 2);
    for (const h of subHeadings) {
      cards.push({ title: h.text, items: [], paragraphs: [] });
    }
    // 把列表项分配到最后一个有标题的卡片
    if (cards.length > 0) {
      for (const list of content.lists) {
        for (const item of list.items) {
          cards[cards.length - 1].items.push(renderInlinePlain(item.inlineMarkup));
        }
      }
    }
  }

  // 生成卡片 HTML
  const cols = cards.length <= 2 ? 2 : (cards.length % 3 === 0 ? 3 : 2);
  const cardsHTML = cards.map((card, i) => {
    const isWarning = card.title.includes('⚠') || card.title.includes('关注') || card.title.includes('挑战');
    const isSuccess = card.title.includes('✅') || card.title.includes('达成') || card.title.includes('计划') || card.title.includes('优势');
    let borderColor = 'var(--color-primary)';
    if (isWarning) borderColor = 'var(--color-warning)';
    if (isSuccess) borderColor = 'var(--color-success)';

    return `
    <div class="summary-card" style="border-left: 4px solid ${borderColor};">
      <h4 class="card-title">${escapeHTML(card.title)}</h4>
      ${card.items.length > 0 ? `<ul class="card-list">${card.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
      ${card.paragraphs.map(p => `<p class="card-text">${escapeHTML(p)}</p>`).join('')}
    </div>`;
  }).join('');

  return `
<div class="slide slide-summary" style="background: var(--color-bg); padding: 36px 44px;">
  <div class="section-title">${escapeHTML(title)}</div>
  <div class="divider"></div>
  <div class="card-grid" style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 14px; margin-top: 4px;">
    ${cardsHTML}
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
