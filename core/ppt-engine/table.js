module.exports = `function addTableSlidePptx(pptx, s) {
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
}`;
