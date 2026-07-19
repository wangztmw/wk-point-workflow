module.exports = `// ============================================================
// 初始化：全局变量 + UI 工具
// ============================================================
var SLIDE_DATA = __SLIDE_DATA__;
var SLIDE_CHART_DATA = __CHART_DATA__;
var CHART_COLORS = __COLORS__;
var BACKGROUND_CONFIG = __BACKGROUND__;

function setStatus(msg, isError) {
  var el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = isError ? '#e94560' : '#8899aa';
}
function showLoading(s) {
  document.getElementById('loading').classList.toggle('active', s);
}

function isWaterfallType(type) {
  return type === 'waterfall' || type === 'waterfall2';
}
function hasWaterfall() {
  return SLIDE_CHART_DATA.some(function(c) { return isWaterfallType(c.chartType); });
}

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
`;
