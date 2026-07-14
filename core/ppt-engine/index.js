/**
 * ppt-engine/index.js — PPTX 导出引擎入口
 *
 * 读取 SLIDE_DATA JSON，调用 PptxGenJS 生成 .pptx 文件。
 * 运行在浏览器端（通过 CDN 加载 PptxGenJS）。
 *
 * 5 种底层导出技术：
 *   text-layout.js   手动布局文字+形状（10个模板）
 *   native-chart.js  原生 OOXML 图表（6个模板）
 *   waterfall.js     形状拼凑瀑布图（2个模板）
 *   table.js         表格（1个模板）
 *   image.js         图片嵌入（3个模板）
 *
 * 当前实现：html-engine 的 buildDocument() 生成 <script> 块，
 * 内含所有导出函数。后续逐步迁移到本目录。
 */

// 导出引擎的核心调度逻辑（浏览器端运行）
const dispatcher = `
function buildPptxFromSlideData() {
  var pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'C16x9', width: 10, height: 5.625 });
  pptx.layout = 'C16x9';
  SLIDE_DATA.forEach(function(s) {
    if (s.type === 'title')           addTitleSlidePptx(pptx, s);
    else if (s.type === 'content')    addContentSlidePptx(pptx, s);
    else if (s.type === 'summary')    addSummarySlidePptx(pptx, s);
    else if (s.type === 'two-column') addTwoColumnSlidePptx(pptx, s);
    else if (s.type === 'three-column') addThreeColSlidePptx(pptx, s);
    else if (s.type === 'kpi-grid')     addKpiGridSlidePptx(pptx, s);
    else if (s.type === 'toc')        addTocSlidePptx(pptx, s);
    else if (s.type === 'section')    addSectionSlidePptx(pptx, s);
    else if (s.type === 'ending')     addEndingSlidePptx(pptx, s);
    else if (s.type === 'quote')      addQuoteSlidePptx(pptx, s);
    else if (s.type === 'image-text')   addImageTextSlidePptx(pptx, s);
    else if (s.type === 'image-full')   addImageFullSlidePptx(pptx, s);
    else if (s.type === 'image-grid')   addImageGridSlidePptx(pptx, s);
    else if (s.type === 'table')      addTableSlidePptx(pptx, s);
    else if (s.type === 'chart') {
      if (isWaterfallType(s.chartType)) addWaterfallShapes(pptx, s);
      else addNativeChartSlide(pptx, s);
    }
    else addFallbackSlidePptx(pptx, s);
    var lastSlide = pptx.slides[pptx.slides.length - 1];
    if (lastSlide && s.type !== 'title') drawBackgroundShapes(lastSlide);
  });
  return pptx;
}
`;

module.exports = { dispatcher };
