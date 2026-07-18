module.exports = `
// ============================================================
// 标签语法 PPT 导出（遍历 blocks，按 tag 分发）
// ============================================================

function pxToIn(px) { return (Number(px) || 0) / 96; }

// 多元素slide中的瀑布图：柱形+轴线+连接线渲染到已有slide
function renderWaterfallBars(slide, rect, tbl) {
  var rows = tbl.rows || [];
  if (rows.length < 3) return;
  var rawData = rows.map(function(r){ return {name:r[0], value:parseFloat(r[1])||0}; });
  var n = rawData.length;
  var barW = (rect.w - 0.2) / n * 0.55;
  var stepX = (rect.w - 0.2) / n;
  var baseY = rect.y + rect.h - 0.3;  // X轴位置
  var chartBottom = baseY;
  // 计算Y范围
  var cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (var i = 1; i < n - 1; i++) { cumVal += rawData[i].value; if (cumVal > cumMax) cumMax = cumVal; }
  var endV = rawData[n-1].value; if (endV > cumMax) cumMax = endV;
  var scale = (rect.h - 0.8) / (cumMax * 1.08 || 1);
  var chartTop = baseY - cumMax * 1.08 * scale;
  // 坐标轴线（稍粗）
  slide.addShape('line', { x: rect.x + 0.1, y: baseY, w: rect.w - 0.2, h: 0, line: { color: 'CCCCCC', width: 1.2 } });  // X轴
  slide.addShape('line', { x: rect.x + 0.1, y: chartTop, w: 0, h: baseY - chartTop, line: { color: 'CCCCCC', width: 1.2 } });  // Y轴
  // Y轴刻度（4档）
  var yRange = cumMax * 1.08;
  var tickCount = 4;
  for (var t = 0; t <= tickCount; t++) {
    var val = Math.round(yRange * t / tickCount);
    var tickY = baseY - val * scale;
    // 刻度短线
    slide.addShape('line', { x: rect.x + 0.05, y: tickY, w: 0.08, h: 0, line: { color: 'CCCCCC', width: 0.6 } });
    // 刻度标签
    slide.addText(String(val), { x: rect.x - 0.05, y: tickY - 0.1, w: 0.4, h: 0.2, fontSize: 6, color: '999999', align: 'right', fontFace: 'Microsoft YaHei' });
  }
  // 柱子 + 标签
  var cumulative = rawData[0].value;
  var linePoints = [rawData[0].value];  // HTML版 linePoints
  rawData.forEach(function(d, i){
    var isFirst = i === 0;
    var isLast = i === n - 1;
    var cx = rect.x + 0.1 + i * stepX + (stepX - barW) / 2;
    var color, barH, barY;
    if (isFirst) {
      barH = Math.abs(d.value) * scale; barY = baseY - barH; color = '2563EB';
    } else if (isLast) {
      barH = d.value * scale; barY = baseY - barH; color = '2563EB';
      linePoints.push(d.value);
    } else {
      if (d.value >= 0) {
        barH = d.value * scale;
        barY = baseY - cumulative * scale - barH;
        color = '16A34A';
      } else {
        barH = Math.abs(d.value) * scale;
        barY = baseY - cumulative * scale;
        color = 'DC2626';
      }
      cumulative += d.value;
      linePoints.push(cumulative);
    }
    if (barH < 0.05) barH = 0.05;
    slide.addShape('rect', { x: cx, y: barY, w: barW, h: barH, fill: { color: color }, rectRadius: 0.02 });
    slide.addText(d.name, { x: cx - stepX*0.15, y: baseY + 0.05, w: barW + stepX*0.3, h: 0.2, fontSize: 6, color: '888888', align: 'center', fontFace: 'Microsoft YaHei' });
    slide.addText(String(d.value), { x: cx, y: barY - 0.18, w: barW, h: 0.15, fontSize: 7, color: color, align: 'center', fontFace: 'Microsoft YaHei', bold: true });
  });
  // 虚线连接：每条线在 linePoints[j] 高度，从 bar[j] 到 bar[j+1]
  for (var j = 0; j < linePoints.length - 1; j++) {
    var lx1 = rect.x + 0.1 + j * stepX + stepX / 2;
    var lx2 = rect.x + 0.1 + (j+1) * stepX + stepX / 2;
    var ly = baseY - linePoints[j] * scale;
    slide.addShape('line', { x: lx1, y: ly, w: lx2 - lx1, h: 0, line: { color: '999999', width: 1, dashType: 'dash' } });
  }
}

// 根据框宽+字号+文本长度估算实际高度（英寸）
function addTagSlidePptx(pptx, s) {
  // 瀑布图：委托专门的形状拼凑函数（它自己创建 slide）
  if (s.blocks && s.blocks.length === 1 && s.blocks[0].tag === 'chart') {
    var st = s.blocks[0].style || {};
    var ct = (st.chartType || st.type || 'bar').toLowerCase();
    if (ct === 'waterfall' || ct === 'waterfall2') {
      var tbl = s.blocks[0].data;
      if (tbl && tbl.headers && tbl.headers.length >= 2) {
        var cats = tbl.rows.map(function(r){return r[0];});
        var ser = [];
        for (var c = 1; c < tbl.headers.length; c++) {
          ser.push({name:tbl.headers[c], values:tbl.rows.map(function(r){return parseFloat(r[c])||0;})});
        }
        addWaterfallShapes(pptx, {chartType:ct, categories:cats, series:ser, title:st.title||s.title||''});
        return;
      }
    }
  }

  var slide = pptx.addSlide();
  // DARK_SLIDE_TYPES 来自 types/ppt-extract.js，嵌入 SLIDE_DATA 常量区
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
  // layout slide 的坐标已是英寸（投影层 layout-engine 产出），其余是像素需 pxToIn
  var isLayoutSlide = s.type === 'stack' || s.type === 'grid' || s.type === 'split';
  s.blocks.forEach(function(block) {
    var st = block.style || {};
    var tag = block.tag;
    var rect = isLayoutSlide
      ? { x: Number(st.x) || 0.6, y: Number(st.y) || 0.3, w: Number(st.w) || 8.8, h: Number(st.h) || 0.4 }
      : { x: pxToIn(st.x), y: pxToIn(st.y), w: pxToIn(st.w || 820), h: pxToIn(st.h || 40) };

    // 查注册表渲染
    var entry = REGISTRY[tag];
    if (entry && entry.ppt) {
      entry.ppt(slide, block.data, st, rect);
    }
  });
}
`;