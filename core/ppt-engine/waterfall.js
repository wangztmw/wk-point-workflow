module.exports = `// ============================================================
// ★ 瀑布图形状拼凑 ★
// 每根柱子 = 独立 PptxGenJS 矩形，虚线连接累计值
// ============================================================

function addWaterfallShapes(pptx, info) {
  var slide = pptx.addSlide();
  drawBackgroundShapes(slide);
  var chartX = 0.8, chartW = 8.5;
  var chartY = 1.0, chartH = 4.2;
  var catCount = info.categories.length;
  var stepX = chartW / catCount;
  var barW = stepX * 0.55;
  var gapX = (stepX - barW) / 2;

  // 判断合计行
  function isSubtotalRow(name) { return /合计|小计|汇总|总计/.test(name); }

  // 计算最大值（考虑分段累计）
  var vals = info.series[0].values;
  var cats = info.categories;
  var maxAbs = Math.abs(vals[0]);
  var cumVal = vals[0], cumMax = cumVal;
  for (var j = 1; j < vals.length - 1; j++) {
    if (isSubtotalRow(cats[j])) { cumVal = vals[j]; if (cumVal > cumMax) cumMax = cumVal; continue; }
    cumVal += vals[j];
    if (cumVal > cumMax) cumMax = cumVal;
    if (Math.abs(vals[j]) > maxAbs) maxAbs = Math.abs(vals[j]);
  }
  if (vals[vals.length - 1] > cumMax) cumMax = vals[vals.length - 1];
  maxAbs = Math.ceil(Math.max(maxAbs, cumMax) * 1.08);

  function toY(val) { return (val / maxAbs) * chartH; }
  function yPos(val) { return chartY + chartH - toY(val); }

  // 标题
  if (info.title) {
    slide.addText(info.title, { x: 0.5, y: 0.3, w: 9, h: 0.45, fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei' });
  }

  var runningTotal = 0;
  var prevConnectY = 0;

  for (var i = 0; i < catCount; i++) {
    var val = info.series[0].values[i];
    var cat = info.categories[i];
    var cx = chartX + i * stepX + gapX;

    var isFirst = (i === 0);
    var isLast = (i === catCount - 1);
    var isSub = isSubtotalRow(cat);  // 中间合计行

    var barBottomY, barH, barColor;

    if (isFirst) {
      var startVal = Math.abs(val);
      barBottomY = yPos(startVal);
      barH = toY(startVal);
      barColor = '2563EB';
      runningTotal = val;
    } else if (isLast) {
      barBottomY = yPos(val);
      barH = toY(val);
      barColor = '2563EB';
    } else if (isSub) {
      barBottomY = yPos(val);
      barH = toY(val);
      barColor = '2563EB';
      runningTotal = val;
    } else {
      var delta = val;
      if (delta >= 0) {
        barBottomY = yPos(runningTotal + delta);
        barH = toY(delta);
        barColor = '16A34A';
      } else {
        barBottomY = yPos(runningTotal);
        barH = toY(Math.abs(delta));
        barColor = 'DC2626';
      }
      runningTotal += delta;
    }

    // ★ 画柱子
    slide.addShape('rect', {
      x: cx, y: barBottomY, w: barW, h: Math.max(barH, 0.04),
      fill: { color: barColor },
      rectRadius: barW > 0.3 ? 0.04 : 0.02,
      line: { color: 'FFFFFF', width: 0.3 },
    });

    // 标签
    var labelY = barBottomY - 0.22;
    var labelText = (isFirst || isLast) ? String(val) : (val >= 0 ? '+' + val : String(val));
    slide.addText(labelText, {
      x: cx - 0.05, y: labelY, w: barW + 0.1, h: 0.2,
      fontSize: Math.min(barW * 28, 9), align: 'center',
      color: '333333', fontFace: 'Arial', bold: true,
    });

    // ★ 虚线连接：增量/落地柱连顶部，减量柱连底部
    var connectY;
    if (isFirst || isLast || isSub) {
      connectY = barBottomY;           // 落地柱：顶部平齐
    } else if (val >= 0) {
      connectY = barBottomY;           // 增量柱：顶部平齐（新累计值在顶部）
    } else {
      connectY = barBottomY + barH;    // 减量柱：底部平齐（新累计值在底部）
    }
    if (i > 0) {
      slide.addShape('line', {
        x: chartX + (i - 1) * stepX + gapX + barW / 2,
        y: prevConnectY,
        w: stepX,
        h: 0,
        line: { color: '999999', width: 1.0, dashType: 'dash' },
      });
    }
    prevConnectY = connectY;

    // X 轴标签
    slide.addText(cat, {
      x: cx - 0.2, y: chartY + chartH + 0.04, w: barW + 0.4, h: 0.22,
      fontSize: 8, align: 'center', color: '666666', fontFace: 'Microsoft YaHei',
    });
  }

  // Y 轴刻度标签（只保留数字，不画背景网格线）
  var numTicks = 4;
  for (var t = 0; t <= numTicks; t++) {
    var tickVal = Math.round((maxAbs / numTicks) * t);
    var tickY = yPos(tickVal);
    slide.addText(String(tickVal), {
      x: chartX - 0.55, y: tickY - 0.1, w: 0.5, h: 0.18,
      fontSize: 8, align: 'right', color: '888888', fontFace: 'Arial',
    });
  }

  // 横轴基准线（y=0）
  var baseY = yPos(0);
  slide.addShape('line', {
    x: chartX, y: baseY, w: chartW, h: 0,
    line: { color: '999999', width: 1.2 },
  });
  // 竖轴（左边界）
  slide.addShape('line', {
    x: chartX, y: chartY, w: 0, h: chartH,
    line: { color: '999999', width: 1.2 },
  });

  // 脚注
  slide.addText('✅ 每根柱子 = 独立矩形，可拖拽/缩放/改色', {
    x: chartX, y: chartY + chartH + 0.3, w: 8, h: 0.2,
    fontSize: 8, color: '2ecc71', fontFace: 'Microsoft YaHei',
  });
}`;
