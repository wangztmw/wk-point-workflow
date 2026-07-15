module.exports = `// ============================================================
// 非图表页 PptxGenJS 渲染（数据驱动，保留视觉结构）
// ============================================================

function addTitleSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.background = { fill: '1a1a2e' };
  if (s.title) slide.addText(s.title, { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 2.6, w: 9, h: 0.6, fontSize: 18, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei' });
}

function addContentSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  var y = 0.4;
  if (s.title) {
    slide.addText(s.title, { x: 0.6, y: y, w: 8.8, h: 0.5, fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    y += 0.5;
    slide.addShape('rect', { x: 0.6, y: y, w: 0.9, h: 0.06, fill: { color: '667eea' } });
    y += 0.35;
  }
  if (s.items) {
    s.items.forEach(function(item) {
      if (y > 5.0) return;
      var runs = [{ text: '▸  ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: 0.8, y: y, w: 8.4, h: 0.32, fontSize: 13, color: '444444', fontFace: 'Microsoft YaHei' });
      y += 0.3;
    });
  }
  if (s.subHeadings) {
    s.subHeadings.forEach(function(h) {
      if (y > 5.0) return;
      slide.addText(h.text, { x: 0.6, y: y, w: 8.8, h: 0.35, fontSize: h.level === 3 ? 16 : 14, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
      y += 0.32;
    });
  }
}

function addSummarySlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  if (!s.cards || s.cards.length === 0) return;
  var cols = s.cards.length <= 2 ? 2 : 3;
  var cardW = 8.6 / cols, cardH = 4.0, cardY = 0.95;
  var colors = ['4472C4', 'ED7D31', '70AD47'];
  s.cards.forEach(function(card, i) {
    var cx = 0.5 + i * (cardW + 0.2);
    slide.addShape('rect', { x: cx, y: cardY, w: cardW, h: cardH, fill: { color: 'F5F7FF' }, rectRadius: 0.08, line: { color: 'E0E0E0', width: 0.5 } });
    var isWarn = card.title.indexOf('⚠')>=0 || card.title.indexOf('关注')>=0 || card.title.indexOf('挑战')>=0;
    var isGood = card.title.indexOf('✅')>=0 || card.title.indexOf('达成')>=0 || card.title.indexOf('计划')>=0 || card.title.indexOf('优势')>=0;
    var borderColor = isWarn ? 'FFC000' : (isGood ? '70AD47' : colors[i % colors.length]);
    slide.addShape('rect', { x: cx, y: cardY, w: 0.06, h: cardH, fill: { color: borderColor } });
    slide.addText(card.title, { x: cx + 0.2, y: cardY + 0.12, w: cardW - 0.3, h: 0.35, fontSize: 14, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    var iy = cardY + 0.55;
    (card.items || []).forEach(function(item) {
      if (iy > cardY + cardH - 0.2) return;
      var runs = [{ text: '• ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: cx + 0.25, y: iy, w: cardW - 0.4, h: 0.28, fontSize: 10, color: '555555', fontFace: 'Microsoft YaHei' });
      iy += 0.25;
    });
  });
}

function addTwoColumnSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  function renderCol(col, cx, color) {
    slide.addShape('rect', { x: cx, y: 0.95, w: 4.2, h: 3.8, fill: { color: 'F5F7FF' }, rectRadius: 0.06 });
    slide.addShape('rect', { x: cx, y: 0.95, w: 0.06, h: 3.8, fill: { color: color } });
    if (col.title) slide.addText(col.title, { x: cx + 0.2, y: 1.05, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    var iy = 1.55;
    (col.items || []).forEach(function(item) {
      if (iy > 4.5) return;
      var runs = [{ text: '▸ ', options: { color: '667eea' } }].concat(item.runs || [{ text: item.text, options: {} }]);
      slide.addText(runs, { x: cx + 0.25, y: iy, w: 3.7, h: 0.32, fontSize: 12, color: '444444', fontFace: 'Microsoft YaHei' });
      iy += 0.3;
    });
  }
  if (s.left) renderCol(s.left, 0.5, '4472C4');
  if (s.right) renderCol(s.right, 5.1, 'ED7D31');
}

function addFallbackSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 24, bold: true, color: '333333', align: 'center', fontFace: 'Microsoft YaHei' });
}

function addTocSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  slide.addShape('rect', { x: 0.5, y: 0.9, w: 0.8, h: 0.05, fill: { color: '667eea' } });
  var iy = 1.3;
  (s.items || []).forEach(function(item, i) {
    slide.addText((i+1) + '.  ' + item, { x: 0.8, y: iy, w: 8.5, h: 0.38, fontSize: 16, color: '444444', fontFace: 'Microsoft YaHei' });
    iy += 0.4;
  });
}

function addSectionSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.background = { fill: '1a1a2e' };
  if (s.title) slide.addText(s.title, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 16, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei' });
  slide.addShape('rect', { x: 4.3, y: 3.6, w: 1.4, h: 0.04, fill: { color: '667eea' } });
}

function addTableSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  if (!s.headers || !s.rows) return;

  // border 数组格式: [上, 右, 下, 左]
  var TK = { pt: 3, color: '1a1a1a', type: 'solid' };
  var HD = { pt: 2, color: '1a1a1a', type: 'solid' };
  var N = { type: 'none' };

  var nCols = s.headers.length;
  var rows = [s.headers.map(function(h) {
    return { text: h, options: {
      bold: true, fontSize: 13, color: '1a1a1a', align: 'center', fontFace: 'Microsoft YaHei',
      border: [TK, N, HD, N],
    }};
  })];

  s.rows.forEach(function(row, i) {
    var isLast = (i === s.rows.length - 1);
    rows.push(row.map(function(c, ci) {
      var isNum = ci > 0 && !isNaN(parseFloat(c));
      return { text: c, options: {
        fill: { color: i%2===0 ? 'F9FAFB' : 'FFFFFF' },
        align: 'center',
        fontFace: isNum ? 'Courier New' : 'Microsoft YaHei',
        fontSize: 12, color: '333333',
        border: isLast ? [N, N, TK, N] : [N, N, N, N],
      }};
    }));
  });

  slide.addTable(rows, {
    x: 0.5, y: 1.1, w: 9.0, fontSize: 12, rowH: 0.42,
    border: { type: 'none' },
    colW: s.headers.map(function(_, ci) { return ci === 0 ? 2.2 : (9.0 - 2.2) / (nCols - 1); }),
  });
}

function addEndingSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  slide.background = { fill: '1a1a2e' };
  if (s.title) slide.addText(s.title, { x: 0.5, y: 2.0, w: 9, h: 1.2, fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.contact) slide.addText(s.contact, { x: 1, y: 3.4, w: 8, h: 0.4, fontSize: 13, color: 'AAAAAA', align: 'center', fontFace: 'Microsoft YaHei' });
}

function addQuoteSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.quote) slide.addText('" ' + s.quote + ' "', { x: 0.8, y: 1.5, w: 8.4, h: 1.5, fontSize: 24, italic: true, color: '333333', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.author) slide.addText('— ' + s.author, { x: 2, y: 3.2, w: 6, h: 0.5, fontSize: 14, color: '888888', align: 'center', fontFace: 'Microsoft YaHei' });
}

function addImageTextSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  var label = s.imgLabel || s.title || '';
  if (s.imgSrc && s.imgSrc.length > 100) {
    try { slide.addImage({ data: s.imgSrc, x: 0.3, y: 0.5, w: 5.0, h: 4.6, sizing: { type: 'contain', w: 5.0, h: 4.6 } }); } catch(e) {}
  } else {
    // 占位框
    slide.addShape('rect', { x: 0.5, y: 0.7, w: 4.6, h: 4.2, fill: { color: 'F5F5F5' }, line: { color: 'CCCCCC', width: 0.5, dashType: 'dash' }, rectRadius: 0.05 });
    if (label) slide.addText(label, { x: 0.5, y: 2.2, w: 4.6, h: 0.3, fontSize: 16, bold: true, color: '999999', align: 'center', fontFace: 'Microsoft YaHei' });
  }
  if (s.title) slide.addText(s.title, { x: 5.6, y: 0.5, w: 4.0, h: 0.5, fontSize: 22, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  slide.addShape('rect', { x: 5.6, y: 1.05, w: 0.7, h: 0.03, fill: { color: '1a1a1a' } });
  if (s.items) {
    var iy = 1.3;
    s.items.forEach(function(item) {
      if (iy > 4.8) return;
      slide.addText('▸ ' + item, { x: 5.6, y: iy, w: 3.8, h: 0.32, fontSize: 13, color: '444444', fontFace: 'Microsoft YaHei' });
      iy += 0.32;
    });
  }
}

function addImageFullSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  var label = s.imgLabel || s.title || '';
  if (s.imgSrc && s.imgSrc.length > 100) {
    try { slide.addImage({ data: s.imgSrc, x: 0, y: 0, w: 10, h: 5.625, sizing: { type: 'cover', w: 10, h: 5.625 } }); } catch(e) {}
    slide.addShape('rect', { x: 0, y: 0, w: 10, h: 5.625, fill: { color: '000000', transparency: 45 } });
  } else {
    // 占位：深色背景 + 标签文本
    slide.background = { fill: '1a1a2e' };
    slide.addShape('rect', { x: 3, y: 1.5, w: 4, h: 2.5, fill: { color: '2a2a4e' }, line: { color: '555588', width: 0.5, dashType: 'dash' }, rectRadius: 0.1 });
    if (label) slide.addText(label, { x: 1, y: 2.2, w: 8, h: 0.4, fontSize: 20, bold: true, color: 'AAAACC', align: 'center', fontFace: 'Microsoft YaHei' });
  }
  if (s.title) slide.addText(s.title, { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
  if (s.subtitle) slide.addText(s.subtitle, { x: 1, y: 2.6, w: 8, h: 0.5, fontSize: 16, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei' });
  slide.addShape('rect', { x: 4.3, y: 3.3, w: 1.4, h: 0.03, fill: { color: 'FFFFFF' } });
}

function addThreeColSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  slide.addShape('rect', { x: 0.5, y: 0.85, w: 0.7, h: 0.03, fill: { color: '1a1a1a' } });
  if (!s.cols) return;
  var colors = ['4472C4', 'ED7D31', '70AD47'];
  s.cols.forEach(function(col, i) {
    var cx = 0.5 + i * 3.1;`;
