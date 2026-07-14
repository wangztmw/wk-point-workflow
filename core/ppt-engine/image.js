module.exports = `slide.addShape('oval', { x: cx + 0.15, y: 1.2, w: 0.45, h: 0.45, fill: { color: colors[i] } });
    slide.addText(String(i+1), { x: cx + 0.15, y: 1.2, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei' });
    if (col.title) slide.addText(col.title, { x: cx + 0.75, y: 1.25, w: 2.0, h: 0.4, fontSize: 15, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
    var iy = 1.8;
    (col.items || []).forEach(function(item) {
      if (iy > 4.6) return;
      slide.addText(item, { x: cx + 0.3, y: iy, w: 2.3, h: 0.28, fontSize: 11, color: '555555', fontFace: 'Microsoft YaHei' });
      iy += 0.26;
    });
  });
}

function addKpiGridSlidePptx(pptx, s) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  if (s.title) slide.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  if (!s.kpis) return;
  var colors = ['4472C4', 'ED7D31', '70AD47', 'FFC000'];
  s.kpis.forEach(function(kpi, i) {
    var row = Math.floor(i / 2), col = i % 2;
    var cx = 0.5 + col * 4.7, cy = 1.1 + row * 2.1;
    slide.addShape('rect', { x: cx, y: cy, w: 4.4, h: 1.9, fill: { color: 'F5F7FF' }, rectRadius: 0 });
    slide.addShape('rect', { x: cx, y: cy, w: 4.4, h: 0.05, fill: { color: colors[i] } });
    slide.addText(kpi.value, { x: cx + 0.3, y: cy + 0.25, w: 3.8, h: 0.7, fontSize: 32, bold: true, color: '1a1a1a', fontFace: 'Courier New' });
    slide.addText(kpi.label, { x: cx + 0.3, y: cy + 1.0, w: 3.8, h: 0.4, fontSize: 12, color: '888888', fontFace: 'Microsoft YaHei' });
    if (kpi.trend) slide.addText(kpi.trend, { x: cx + 0.3, y: cy + 1.35, w: 3.8, h: 0.35, fontSize: 13, bold: true, color: (kpi.trend.startsWith('+')||kpi.trend.startsWith('↑'))?'16A34A':'DC2626', fontFace: 'Microsoft YaHei' });
  });
}`;
