module.exports = `// ============================================================
// 图表数据（从 Markdown 提取，供原生图表导出使用）
// ============================================================
var SLIDE_DATA = __SLIDE_DATA__;
var SLIDE_CHART_DATA = __CHART_DATA__;
var CHART_COLORS = __COLORS__;
var BACKGROUND_CONFIG = __BACKGROUND__;

// ============================================================
// 导出逻辑
// ============================================================

function setStatus(msg, isError) {
  var el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = isError ? '#e94560' : '#8899aa';
}
function showLoading(s) {
  document.getElementById('loading').classList.toggle('active', s);
}

/** 检测是否是瀑布图类型（dom-to-pptx 无法处理，需走形状拼凑） */
function isWaterfallType(type) {
  return type === 'waterfall' || type === 'waterfall2';
}
function hasWaterfall() {
  return SLIDE_CHART_DATA.some(function(c) { return isWaterfallType(c.chartType); });
}

async function exportDomToPptx() {
  await exportHybridPptx();
}

/** 数据驱动导出：遍历 SLIDE_DATA，按类型走不同渲染 */
/** 画矢量背景：用 BACKGROUND_CONFIG.elements 里的形状绘制模板底板 */
function drawBackgroundShapes(slide) {
  if (!BACKGROUND_CONFIG || !BACKGROUND_CONFIG.elements) return;
  var els = BACKGROUND_CONFIG.elements;
  for (var i = 0; i < els.length; i++) {
    var e = els[i];
    try {
      if (e.type === 'rect') {
        slide.addShape('rect', {
          x: e.x, y: e.y, w: e.w, h: e.h,
          fill: e.fill === 'transparent' ? null : { color: e.fill },
          rectRadius: e.rectRadius || 0,
          line: e.fill === 'transparent' ? { color: e.stroke || '4472C4', width: e.strokeWidth || 0.5 } : undefined,
        });
      } else if (e.type === 'text') {
        slide.addText(e.text, {
          x: e.x, y: e.y, w: e.w || 4, h: e.h || 0.4,
          fontSize: e.fontSize || 12, color: e.color || '333333',
          bold: e.bold, align: e.align || 'left', fontFace: 'Microsoft YaHei',
        });
      } else if (e.type === 'line') {
        slide.addShape('line', {
          x: e.x, y: e.y, w: e.w, h: 0,
          line: { color: e.stroke || '999999', width: e.strokeWidth || 0.5 },
        });
      } else if (e.type === 'oval') {
        slide.addShape('oval', {
          x: e.x, y: e.y, w: e.w, h: e.h,
          fill: { color: e.fill || '4472C4' },
        });
      }
    } catch(err) {}
  }
}

function buildPptxFromSlideData() {
  var pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'C16x9', width: 10, height: 5.625 });
  pptx.layout = 'C16x9';
  SLIDE_DATA.forEach(function(s) {
    if (s.parser === 'tag')           { addTagSlidePptx(pptx, s); return; }
    if (s.type === 'title')           addTitleSlidePptx(pptx, s);
    else if (s.type === 'content')    addContentSlidePptx(pptx, s);
    else if (s.type === 'summary')    addSummarySlidePptx(pptx, s);
    else if (s.type === 'two-column') addTwoColumnSlidePptx(pptx, s);
    else if (s.type === 'toc')        addTocSlidePptx(pptx, s);
    else if (s.type === 'section')    addSectionSlidePptx(pptx, s);
    else if (s.type === 'table')      addTableSlidePptx(pptx, s);
    else if (s.type === 'ending')     addEndingSlidePptx(pptx, s);
    else if (s.type === 'quote')      addQuoteSlidePptx(pptx, s);
    else if (s.type === 'three-column') addThreeColSlidePptx(pptx, s);
    else if (s.type === 'kpi-grid')     addKpiGridSlidePptx(pptx, s);
    else if (s.type === 'image-text')   addImageTextSlidePptx(pptx, s);
    else if (s.type === 'image-full')   addImageFullSlidePptx(pptx, s);
    else if (s.type === 'image-gallery') addImageGallerySlidePptx(pptx, s);
    else if (s.type === 'image-grid')   addImageGridSlidePptx(pptx, s);
    else if (s.type === 'chart') {
      if (isWaterfallType(s.chartType)) addWaterfallShapes(pptx, s);
      else addNativeChartSlide(pptx, s);
    }
    else addFallbackSlidePptx(pptx, s);
    // 背景由各渲染函数内部控制 drawBackgroundShapes
  });
  return pptx;
}

async function exportHybridPptx() {
  try {
    setStatus('⏳ 混合导出中...'); showLoading(true);
    var pptx = buildPptxFromSlideData();
    await pptx.writeFile({ fileName: '__TITLE__.pptx' });
    setStatus('✅ 导出成功！所有页面保留视觉结构');
  } catch (err) { console.error(err); setStatus('❌ ' + err.message, true); }
  finally { showLoading(false); }
}

async function exportNativeChartsPptx() {
  try {
    setStatus('⏳ 构建原生图表中...'); showLoading(true);
    var pptx = buildPptxFromSlideData();
    await pptx.writeFile({ fileName: '__TITLE__-native.pptx' });
    setStatus('✅ 导出成功！');
  } catch (err) { console.error(err); setStatus('❌ ' + err.message, true); }
  finally { showLoading(false); }
}`;
