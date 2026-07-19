module.exports = `// ============================================================
// PPT 导出入口：buildPptxFromSlideData + exportPPTX
// ============================================================

function buildPptxFromSlideData() {
  var pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'C16x9', width: 10, height: 5.625 });
  pptx.layout = 'C16x9';
  SLIDE_DATA.forEach(function(s) {
    if (s.type === 'chart') {
      if (isWaterfallType(s.chartType)) addWaterfallShapes(pptx, s);
      else addNativeChartSlide(pptx, s);
      return;
    }
    addTagSlidePptx(pptx, s);
  });
  return pptx;
}

async function exportPPTX() {
  try {
    setStatus('⏳ 正在生成 PPTX...'); showLoading(true);
    var pptx = buildPptxFromSlideData();
    await pptx.writeFile({ fileName: '__TITLE__.pptx' });
    setStatus('✅ 导出成功！');
  } catch (err) { console.error(err); setStatus('❌ ' + err.message, true); }
  finally { showLoading(false); }
}
`;
