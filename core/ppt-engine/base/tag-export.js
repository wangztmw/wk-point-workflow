module.exports = `
// ============================================================
// PPT 端执行器：遍历 blocks，按 _ppt 描述符执行 PptxGenJS 调用
// 不再查 REGISTRY — _ppt 已由 render.js 在 Node 端生成
// ============================================================

function executeBlock(slide, block, pptx) {
  var p = block._ppt;
  var r = block.rect || {};
  if (!p || !p.action) return;

  switch (p.action) {
    case 'addText':
      slide.addText(p.runs || p.text || '', {
        x: r.x, y: r.y, w: r.w, h: r.h,
        fontSize: p.fontSize || 13,
        color: p.color || '333333',
        bold: p.bold || false,
        align: p.align || 'left',
        fontFace: p.fontFace || 'Microsoft YaHei',
        valign: p.valign || 'top',
      });
      break;

    case 'addListItems':
      var items = p.items || [];
      var iy = r.y;
      var itemW = r.w - 0.2;
      items.forEach(function(item) {
        // 估算 item 高度
        var fullText = '';
        (item.runs || []).forEach(function(run) { fullText += run.text || ''; });
        var lines = textLines(fullText, itemW, item.fontSize || 12);
        var itemH = Math.max(0.28, lines * (item.fontSize || 12) / 96 * 2.0 + 0.04);
        if (iy > r.y + r.h - 0.1) return;
        slide.addText(item.runs || item.text || '', {
          x: r.x + 0.1, y: iy, w: r.w - 0.2, h: itemH,
          fontSize: item.fontSize || 12,
          fontFace: item.fontFace || 'Microsoft YaHei',
        });
        iy += itemH + 0.02;
      });
      break;

    case 'addTable':
      slide.addTable(p.rows, {
        x: r.x, y: r.y, w: r.w,
        border: { type: 'none' },
        colW: p.colW.map(function(w) { return r.w * w; }),
        rowH: p.rowH || 0.3,
      });
      break;

    case 'addChart':
      slide.addChart(pptx.charts[p.chartType], p.chartData, {
        x: r.x, y: r.y, w: r.w, h: r.h,
        showLegend: p.showLegend || false,
        legendPos: 'b',
        showValue: true,
        dataLabelPosition: 'outEnd',
        chartColors: CHART_COLORS,
        catAxisLabelFontSize: (p.chartType === 'PIE' || p.chartType === 'DOUGHNUT') ? undefined : 8,
        valAxisLabelFontSize: (p.chartType === 'PIE' || p.chartType === 'DOUGHNUT') ? undefined : 8,
      });
      break;

    case 'addImage':
      if (p.imgSrc && p.imgSrc.length > 100) {
        try {
          slide.addImage({ data: p.imgSrc, x: r.x, y: r.y, w: r.w, h: r.h,
            sizing: { type: 'contain', w: r.w, h: r.h } });
        } catch(e) {}
      } else {
        slide.addShape('rect', {
          x: r.x, y: r.y, w: r.w, h: r.h,
          fill: { color: 'F5F5F5' },
          line: { color: 'CCCCCC', width: 0.5, dashType: 'dash' },
          rectRadius: 0.05,
        });
        if (p.label) slide.addText(p.label, {
          x: r.x, y: r.y + r.h/2 - 0.15, w: r.w, h: 0.3,
          fontSize: 11, bold: true, color: '999999',
          align: 'center', fontFace: 'Microsoft YaHei',
        });
      }
      break;

    case 'addShape':
      var shapeOpts = { x: r.x, y: r.y, w: r.w, h: r.h };
      if (p.fill) shapeOpts.fill = { color: p.fill };
      if (p.line) shapeOpts.line = p.line;
      if (p.rectRadius) shapeOpts.rectRadius = p.rectRadius;
      slide.addShape(p.shapeType || 'rect', shapeOpts);
      break;
  }
}

// 标签语法 PPT 导出
function addTagSlidePptx(pptx, s) {
  // 瀑布图：委托 addWaterfallShapes（它自己创建 slide，不走 executeBlock）
  if (s.blocks && s.blocks.length === 1 && s.blocks[0]._ppt
      && s.blocks[0]._ppt.action === 'addWaterfall') {
    var wf = s.blocks[0]._ppt;
    addWaterfallShapes(pptx, {
      chartType: wf.chartType,
      categories: wf.chartData.categories,
      series: wf.chartData.series,
      title: s.title || '',
    });
    return;
  }

  var slide = pptx.addSlide();
  var DARK_TYPES = __DARK_TYPES__;
  var isDark = DARK_TYPES.indexOf(s.type) >= 0;
  if (isDark) slide.background = { fill: '1a1a2e' };
  drawBackgroundShapes(slide);

  // 布局类 slide：渲染页面标题
  var isLayoutSlide = s.type === 'stack' || s.type === 'grid' || s.type === 'split';
  if (isLayoutSlide && s.title) {
    slide.addText(s.title, { x: 0.6, y: 0.15, w: 8.8, h: 0.4, fontSize: 20, bold: true, color: '1a1a1a', fontFace: 'Microsoft YaHei' });
  }

  if (!s.blocks) return;
  // block.rect 已由 render.js 归一化为英寸，直接使用
  s.blocks.forEach(function(block) {
    executeBlock(slide, block, pptx);
  });
}
`;