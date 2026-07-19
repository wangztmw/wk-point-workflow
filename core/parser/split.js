/**
 * split.js — 文本切割
 *
 * splitSlides: 按 --- 分割幻灯片
 * extractDirective: 提取 <!-- slide: type, key=value --> 注释
 */

/** 按 `\n---\n` 分割为原始幻灯片块（避免分割代码块和表格中的 ---） */
function splitSlides(md) {
  const lines = md.split('\n');
  const slides = [];
  let current = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      current.push(line);
      continue;
    }
    if (!inCodeBlock && line.trim() === '---') {
      if (current.length > 0) {
        slides.push(current.join('\n').trim());
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    slides.push(current.join('\n').trim());
  }
  return slides;
}

/** 提取 <!-- slide: type, key=value, ... --> 注释 */
function extractDirective(text) {
  const match = text.match(/<!--\s*slide:\s*([^>]+?)\s*-->/);
  if (!match) return null;

  const parts = match[1].split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const type = parts[0];
  const props = {};

  for (let i = 1; i < parts.length; i++) {
    const kv = parts[i].split('=').map(s => s.trim());
    if (kv.length === 2) {
      props[kv[0]] = kv[1].replace(/^["']|["']$/g, '');
    } else {
      props[kv[0]] = true;
    }
  }

  return { type, props };
}

module.exports = { splitSlides, extractDirective };
