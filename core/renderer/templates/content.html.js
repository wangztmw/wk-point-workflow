/**
 * content.html.js — 内容/列表页模板
 *
 * 渲染：标题 + 分隔线 + 列表/段落
 * 适用于：普通内容页、要点罗列、总分说明
 */

function render(ast, config) {
  const { content, props } = ast;

  // 标题：优先用第一个 h2
  const title = content.headings[0]?.text || props.title || '';

  // ★ 按 Markdown 原始顺序渲染（从 blocks 数组读取）
  let contentHTML = '';
  const blocks = content.blocks || [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      const h = block.data;
      if (h.level >= 3) {
        contentHTML += `<h${h.level} class="slide-subheading">${escapeHTML(h.text)}</h${h.level}>`;
      }
    } else if (block.type === 'list') {
      const list = block.data;
      const tag = list.ordered ? 'ol' : 'ul';
      const itemsHTML = list.items.map(item =>
        `<li>${renderInline(item.inlineMarkup)}</li>`
      ).join('');
      contentHTML += `<${tag} class="slide-list">${itemsHTML}</${tag}>`;
    } else if (block.type === 'paragraph') {
      const p = block.data;
      contentHTML += `<p class="slide-para">${renderInline(p.inlineMarkup)}</p>`;
    } else if (block.type === 'image') {
      const img = block.data;
      contentHTML += `<div class="slide-image-wrap"><img src="${escapeHTML(img.src)}" alt="${escapeHTML(img.alt || '')}" style="max-width:100%;max-height:350px;border-radius:8px;"/></div>`;
    }
  }

  return `
<div class="slide slide-content" style="background: var(--color-bg); padding: 48px 70px;">
  ${title ? `<div class="section-title" style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:10px;">${escapeHTML(title)}</div>
  <div class="divider"></div>` : ''}
  <div class="content-body">${contentHTML}</div>
</div>`;
}

/**
 * 渲染内联标记为 HTML
 */
function renderInline(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  return nodes.map(node => {
    switch (node.type) {
      case 'text': return escapeHTML(node.value);
      case 'bold': return `<strong>${renderInline(node.content)}</strong>`;
      case 'italic': return `<em>${renderInline(node.content)}</em>`;
      case 'code': return `<code style="background:rgba(0,0,0,0.06);padding:1px 6px;border-radius:3px;font-size:0.9em;">${escapeHTML(node.value)}</code>`;
      default: return '';
    }
  }).join('');
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { render, renderInline, escapeHTML };
