const { esc } = require('../../elements/shared/escape');
/**
 * title.html.js — 标题页（封面页）模板
 *
 * 渲染：渐变背景 + 大标题 + 副标题 + 标签行
 * props: theme (dark|light|gradient), title
 * content: headings (h1 = 主标题, h2 = 副标题), paragraphs (标签)
 */

function render(ast, config) {
  const { content, props } = ast;
  const mainTitle = content.headings[0]?.text || props.title || config.title || '';
  const subTitle = content.headings[1]?.text || props.subtitle || '';

  // 主题选择
  const theme = props.theme || 'gradient';
  let bgStyle;
  let textColor;
  if (theme === 'dark') {
    bgStyle = 'background: linear-gradient(135deg, #0f3460 0%, #16213e 50%, #e94560 100%);';
    textColor = '#ffffff';
  } else if (theme === 'light') {
    bgStyle = 'background: linear-gradient(135deg, #f8f9ff 0%, #eef0ff 100%);';
    textColor = '#222222';
  } else {
    // gradient (default)
    bgStyle = `background: linear-gradient(135deg, ${config.theme.primary} 0%, #764ba2 100%);`;
    textColor = '#ffffff';
  }

  // 标签行（从 paragraphs 或 badge 属性的 badge 列表提取）
  const badges = [];
  for (const p of content.paragraphs) {
    badges.push(p.text);
  }

  // 生成标签 HTML
  const badgeHTML = badges.length > 0
    ? `<div class="badge-row">${badges.map(b => `<span class="badge-tag">${esc(b)}</span>`).join('')}</div>`
    : '';

  return `
<div class="slide slide-title" style="${bgStyle} color: ${textColor}; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
  <div class="main-title" style="font-size: 44px; font-weight: 800; letter-spacing: 2px; text-shadow: ${theme === 'light' ? 'none' : '0 2px 10px rgba(0,0,0,0.3)'}; margin-bottom: 16px; font-family: var(--font-heading);">
    ${esc(mainTitle)}
  </div>
  ${subTitle ? `<div class="sub-title" style="font-size: 22px; opacity: 0.9; font-weight: 300; margin-bottom: ${badges.length > 0 ? '24px' : '0'};">
    ${esc(subTitle)}
  </div>` : ''}
  ${badgeHTML}
</div>`;
}


module.exports = { render };
