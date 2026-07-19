/**
 * elements.js — 调 meta-templates/elements 绑定 _html + _ppt
 *
 * 加新元素只需在 meta-templates/elements/index.js 注册，此文件无须改动。
 */

var AST = require('../meta-templates/types/ast');
var T = AST.TAGS;
var ELEMENTS = require('../meta-templates/elements/registry');
var { textLines } = require('./height');

function pxToIn(px) { return (Number(px) || 0) / 96; }

function bindElements(blocks, isLayout) {
  if (!blocks || !blocks.length) return;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var tag = block.tag;
    var st = block.style || {};
    var data = block.data || {};

    if (!tag) {
      var type = block.type;
      if (type === 'heading' && data.level) tag = 'h' + data.level;
      else if (type === 'paragraph') tag = 'p';
      else if (type === 'list') tag = 'list';
      else if (type === 'image') tag = 'img';
      block.tag = tag;
    }

    // rect
    if (block.pos && block.pos.inches) {
      block.rect = block.pos.inches;
    } else if (isLayout) {
      block.rect = { x: Number(st.x) || 0.6, y: Number(st.y) || 0.3, w: Number(st.w) || 8.8, h: Number(st.h) || 0.4 };
    } else {
      block.rect = { x: pxToIn(st.x), y: pxToIn(st.y), w: pxToIn(st.w || 820), h: pxToIn(st.h || 40) };
    }

    // _html + _ppt
    var el = ELEMENTS[tag];
    if (el) {
      var fsTag = T[tag]; if (fsTag && !st['font-size']) st['font-size'] = fsTag.fs;
      block._html = el.html(data, st);
      block._ppt = el.ppt(data, st);
    } else {
      block._html = '';
      block._ppt = null;
    }

    // PPT 文本截断：确保文本长度不超出 rect 容量
    truncatePPT(block);
  }
}

/** 按 rect 容量截断 _ppt 中的文本，防止 PPT 端溢出 */
function truncatePPT(block) {
  var ppt = block._ppt;
  var r = block.rect || {};
  if (!ppt || !r.w || !r.h) return;

  var w = r.w, h = r.h, fs, maxLines, fullText;

  if (ppt.action === 'addText') {
    fs = ppt.fontSize || 13;
    maxLines = Math.max(1, Math.floor(h * 96 / (fs * 1.8)));
    fullText = ppt.text || '';
    if (ppt.runs) fullText = ppt.runs.map(function(r) { return r.text || ''; }).join('');

    var fitChars = fitCount(fullText, w, fs, maxLines);
    if (fitChars < fullText.length) {
      var truncated = fullText.substring(0, Math.max(1, fitChars - 1)).replace(/\s+$/, '') + '…';
      if (ppt.runs) {
        ppt.runs = [{ text: truncated, options: { fontSize: fs, color: ppt.color, fontFace: ppt.fontFace } }];
      } else {
        ppt.text = truncated;
      }
    }
  } else if (ppt.action === 'addListItems') {
    var items = ppt.items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      fs = item.fontSize || 12;
      maxLines = Math.max(1, Math.floor(itemH(item) / (fs * 1.8 / 96)));
      fullText = (item.runs || []).map(function(r) { return r.text || ''; }).join('');
      fitChars = fitCount(fullText, w - 0.2, fs, maxLines);
      if (fitChars < fullText.length) {
        item.runs = [{ text: fullText.substring(0, Math.max(1, fitChars - 1)).replace(/\s+$/, '') + '…', options: { fontSize: fs, fontFace: item.fontFace } }];
      }
    }
  }
}

function itemH(item) {
  return 0.28; // approximate per-item height for truncation check
}

function fitCount(text, colW, fs, maxLines) {
  var lines = textLines(text, colW, fs);
  if (lines <= maxLines) return text.length;
  // 估算每行字符数
  var cpl = Math.floor(colW * 96 / (fs * 0.7));
  if (cpl < 1) cpl = 1;
  return maxLines * cpl;
}

module.exports = { bindElements };
