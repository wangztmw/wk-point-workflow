/**
 * document.js — 最终 HTML 文档组装
 *
 * 拼接 CSS + slidesHTML + PPT 导出脚本 → 完整 HTML 文件。
 */

const { buildSlideData, DARK_SLIDE_TYPES } = require('../render/build-slide-data');

/** 主题 CSS 变量 */
function themeCSS(config) {
  const t = config.theme;
  return `
    :root {
      --color-primary: ${t.primary};
      --color-accent: ${t.accent};
      --color-success: ${t.success};
      --color-warning: ${t.warning};
      --color-bg: ${t.bg};
      --color-text: ${t.text};
      --font-body: ${t.fontFamily};
      --font-heading: ${t.fontFamily};
      --slide-width: ${config.width}px;
      --slide-height: ${config.height}px;
    }
  `;
}

/** AST → SLIDE_DATA JSON */
function extractSlideData(slides) {
  return slides.map(ast => buildSlideData(ast));
}

/**
 * 组装完整 HTML 文档
 */
function buildDocument({ title, slidesHTML, slides, config }) {
  const slideData = extractSlideData(slides);
  const slideCount = slides.length;
  const chartSlides = slideData.filter(s => s.type === 'chart');
  const customCSS = themeCSS(config);

  const { generate: generatePptScript } = require('../ppt-engine/assemble');
  const pptScript = generatePptScript({
    slideDataJSON: JSON.stringify(slideData),
    chartDataJSON: JSON.stringify(chartSlides),
    colorsJSON: JSON.stringify((config.chartColors || []).map(c => c.replace('#', ''))),
    backgroundJSON: config.background ? JSON.stringify(config.background) : 'null',
    slideCount, title: esc(title),
    svgAsVector: config.export.svgAsVector,
    autoEmbedFonts: config.export.autoEmbedFonts,
    chartSlidesLen: chartSlides ? chartSlides.length : 0,
    darkTypesJSON: JSON.stringify(DARK_SLIDE_TYPES),
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
/* ===== 全局样式 ===== */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;background:#f0f0eb;color:#1a1a1a;display:flex;flex-direction:column;align-items:center;padding:24px 20px 60px;min-height:100vh}

/* ===== 工具栏 ===== */
.toolbar{position:sticky;top:0;z-index:100;background:#fff;padding:12px 24px;margin-bottom:28px;display:flex;gap:10px;align-items:center;box-shadow:0 1px 0 #e8e8ec,0 4px 12px rgba(0,0,0,0.04);flex-wrap:wrap;justify-content:center;width:100%;max-width:1000px}
.toolbar h1{font-size:15px;font-weight:600;margin-right:8px;white-space:nowrap;color:#1a1a1a}
.toolbar .btn{padding:8px 16px;border:1px solid #e8e8ec;border-radius:0;font-size:13px;font-weight:500;cursor:pointer;background:#fff;color:#555;font-family:inherit}
.toolbar .btn:hover{background:#f5f5f5;border-color:#ccc}
.toolbar .btn-primary{background:#4f5fd9;color:#fff;border-color:#4f5fd9}
.toolbar .btn-primary:hover{background:#3d4dc0}
.toolbar .btn-success{background:#2ecc71;color:#fff;border-color:#2ecc71}
.toolbar .status{font-size:12px;color:#888;margin-left:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ===== 幻灯片容器 ===== */
.slides-wrapper{display:flex;flex-direction:column;gap:36px;width:100%;max-width:1000px}
.slide{width:var(--slide-width);height:var(--slide-height);position:relative;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);background:var(--color-bg);flex-shrink:0;border-left:3px solid transparent}
.slide:hover{border-left-color:var(--color-primary);transition:border-left-color .3s}
@media(max-width:1000px){.slide{width:90vw;height:calc(90vw * .5625)}}

/* ===== 加载遮罩 ===== */
.loading-overlay{display:none;position:fixed;inset:0;z-index:999;background:rgba(255,255,255,0.85);justify-content:center;align-items:center}
.loading-overlay.active{display:flex}
.loading-box{background:#fff;padding:28px 44px;text-align:center;box-shadow:0 2px 24px rgba(0,0,0,0.1)}
.spinner{width:36px;height:36px;border:2px solid #e8e8ec;border-top-color:#4f5fd9;animation:spin .8s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== 主题 CSS 变量 ===== */
${customCSS}
${config.background && config.background.backgroundImage ? `
  .slide:not(.slide-title)::before {
    content:'';position:absolute;inset:0;z-index:0;
    background-image:url(${config.background.backgroundImage});
    background-size:960px 540px;background-repeat:no-repeat;pointer-events:none;
  }
  .slide:not(.slide-title) > * {position:relative;z-index:1;}
` : ''}
</style>
</head>
<body>

<div class="toolbar">
  <h1>📊 ${esc(title)}</h1>
  <span style="font-size:12px;color:#8899aa;">${slideCount} 页</span>
  <span style="flex:1;"></span>
  <button class="btn btn-primary" onclick="exportPPTX()">⬇ 导出 PPTX</button>
  <span class="status" id="status"></span>
</div>

<div class="slides-wrapper" id="slides-container">
${slidesHTML}
</div>

<div class="loading-overlay" id="loading">
  <div class="loading-box">
    <div class="spinner"></div>
    <p>正在生成 PPTX...</p>
    <p style="font-size:12px;color:#8899cc;margin-top:4px;">DOM 测量 + 形状映射中</p>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>

${pptScript}
</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { buildDocument };
