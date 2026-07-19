/**
 * validate.js — 元素遮挡检测 + 自动修正
 *
 * 两阶段运行：
 *   pre-bind: 用 block 数据估算实际尺寸
 *   post-bind: 用 _ppt 数据精确计算 PPT 渲染尺寸
 */

var { textLines } = require('./height');

function validate(blocks, page, box, pattern, stage) {
  if (!blocks || !pattern || blocks.length < 2) return;
  var pageTop = page.contentTop || 0.7, pageH = page.contentH || 4.7;

  for (var round = 0; round < 3; round++) {
    // 每个 block 的实际矩形
    var rects = blocks.map(function(b) {
      if (stage === 'post' && b._ppt) return pptRect(b);
      return estRect(b);
    });

    // 遮挡检测
    var overlap = false;
    for (var i = 0; i < rects.length; i++) {
      var ai = rects[i]; if (!ai) continue;
      for (var j = i + 1; j < rects.length; j++) {
        var bj = rects[j]; if (!bj) continue;
        if (ai.x < bj.x + bj.w && ai.x + ai.w > bj.x && ai.y < bj.y + bj.h && ai.y + ai.h > bj.y) {
          overlap = true; break;
        }
      }
      if (overlap) break;
    }

    // 整体包围盒是否超出页面
    var maxY = 0;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i]; if (r && r.y + r.h > maxY) maxY = r.y + r.h;
    }
    var overflows = maxY > pageTop + pageH;

    if (!overlap && !overflows) {
      // 内容太小时尝试放大（仅在 post 阶段，此时 _ppt 已生成）
      if (stage === 'post' && maxY < pageTop + pageH * 0.5) {
        for (var i = 0; i < blocks.length; i++) {
          var st2 = blocks[i].style || {};
          var fs2 = Number(st2['font-size']);
          if (fs2 > 0 && fs2 < 48) st2['font-size'] = String(Math.min(48, Math.round(fs2 * 1.1)));
        }
        pattern.arrange(blocks, box);
        continue;
      }
      break;
    }

    // 等比缩小 + 重排
    for (var i = 0; i < blocks.length; i++) {
      var st = blocks[i].style || {};
      var fs = Number(st['font-size']);
      if (fs > 6) st['font-size'] = String(Math.max(6, Math.round(fs * 0.92)));
    }
    pattern.arrange(blocks, box);
  }
}

/** pre-bind：用 block 数据估算实际矩形 */
function estRect(block) {
  var p = block.pos; if (!p || !p.inches) return null;
  var st = block.style || {}, data = block.data || {};
  var fs = Number(st['font-size']) || 12, colW = p.inches.w;
  var text = textOf(block);
  if (!text) return { x: p.inches.x, y: p.inches.y, w: colW, h: p.inches.h };

  var pixW = 0;
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i);
    pixW += fs * ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3000 && c <= 0x303F) || (c >= 0xFF00 && c <= 0xFFEF) ? 1.0 : 0.55);
  }
  var lines = Math.max(1, Math.ceil(pixW / (colW * 96)));
  return { x: p.inches.x, y: p.inches.y, w: Math.min(colW, pixW / 96), h: lines * fs / 96 * 2.0 + 0.10 };
}

/** post-bind：用 _ppt 数据精确算 PPT 渲染矩形 */
function pptRect(block) {
  var r = block.rect, ppt = block._ppt; if (!r || !ppt) return null;
  var fs = ppt.fontSize || (ppt.items ? (ppt.items[0] || {}).fontSize : 12) || 12;
  var text = ppt.text || '';
  if (ppt.runs) text = ppt.runs.map(function(run) { return run.text || ''; }).join('');
  if (ppt.items) text = ppt.items.map(function(it) { return (it.runs || []).map(function(run) { return run.text || ''; }).join(''); }).join(' ');

  if (!text) return { x: r.x, y: r.y, w: r.w, h: r.h };
  var lines = Math.max(1, textLines(text, r.w, fs));
  return { x: r.x, y: r.y, w: r.w, h: Math.max(lines * fs / 96 * 2.0 + 0.06, r.h * 0.5) };
}

function textOf(block) {
  var d = block.data || {}, tag = block.tag;
  if (tag && (tag[0] === 'h' || tag === 'p' || tag === 'callout')) return d.text || '';
  if (tag === 'list') return (d.items || []).map(function(it) { return typeof it === 'string' ? it : (it.text || ''); }).join(' ');
  return '';
}

module.exports = { validate };
