/**
 * images.js — 图片文件夹解析
 *
 * 从 images/<label>/ 子文件夹读取图片，转为 base64 data URI。
 * 空文件夹 → 渲染占位框。
 */

const fs = require('fs');
const path = require('path');

const { IMAGE_SLIDE_TYPES } = require('../render/ppt-data');

/**
 * 解析 slide 的图片：对 image-* 类型扫描 images/<label>/ 子文件夹
 */
function resolveImages(ast, projectDir) {
  if (!projectDir) return;
  if (ast.parser === 'tag') {
    resolveTagBlocks(ast, projectDir);
  } else {
    // markdown-converted: labels from lists or H3+ headings
    resolveLabels(ast, projectDir);
  }
}

/** 标签语法：遍历 blocks 中的 img 标签，扫描文件夹 */
function resolveTagBlocks(ast, projectDir) {
  const imagesDir = path.join(projectDir, 'images');
  if (!fs.existsSync(imagesDir)) return;

  for (const block of ast.content.blocks) {
    if (block.tag !== 'img') continue;
    const label = block.data.label;
    if (!label) continue;
    const src = readImageFromFolder(imagesDir, label);
    if (src) block.data.src = src;
    if (!ast.content.images) ast.content.images = [];
    ast.content.images.push(block.data);
  }
}

/** 提取标签名 + 扫描文件夹 */
function resolveLabels(ast, projectDir) {
  if (!IMAGE_SLIDE_TYPES.includes(ast.type)) return;
  const imagesDir = path.join(projectDir, 'images');
  if (!fs.existsSync(imagesDir)) return;

  const existingImages = ast.content.images || [];
  let labels = existingImages.filter(img => img.label).map(img => img.label);
  if (labels.length === 0) {
    for (const list of ast.content.lists) {
      for (const item of list.items) {
        const text = (item.text || '').trim();
        if (text) labels.push(text);
      }
    }
  }
  if (labels.length === 0) {
    labels = ast.content.headings.filter(h => h.level >= 3).map(h => h.text);
  }
  if (labels.length === 0) return;

  const hasExistingSrc = existingImages.length > 0 && existingImages.some(img => img.src && img.src.length > 100);

  const resolvedImages = labels.map((label, i) => {
    if (hasExistingSrc && existingImages[i] && existingImages[i].src && existingImages[i].src.length > 100) {
      return { src: existingImages[i].src, label };
    }
    const src = readImageFromFolder(imagesDir, label);
    return { src: src || '', label };
  });

  ast.content.images = resolvedImages;
}

/** 读取 images/<label>/ 下第一张图片，返回 data URI */
function readImageFromFolder(imagesDir, label) {
  const folderPath = path.join(imagesDir, label);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return null;
  const files = fs.readdirSync(folderPath).filter(f =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f) && !f.startsWith('.')
  );
  if (files.length === 0) return null;
  try {
    const imgPath = path.join(folderPath, files[0]);
    const data = fs.readFileSync(imgPath);
    const ext = path.extname(files[0]).toLowerCase();
    const mimeMap = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (_) { return null; }
}

module.exports = { resolveImages };
