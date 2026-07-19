/**
 * standard-page.js — 标准页空间定义
 *
 * 所有页类型集中管理，方便调整。
 */

module.exports = {
  // 全局画布：PPT 16:9 标准 = 10 × 5.625 英寸（96 DPI = 960 × 540 px）
  canvasW: 10,
  canvasH: 5.625,
  dpi: 96,

  content: {
    titleH:    0.50,
    subtitleH: 0.15,
    contentTop: 0.70,
    contentH:   4.70,
    contentW:   8.8,
    bottomMargin: 0.225,  // 底部留白
  },
  title: {
    contentTop: 0,
    contentH:   5.4,
    contentW:   8.0,
  },
  section: {
    contentTop: 0,
    contentH:   5.4,
    contentW:   8.0,
  },
  ending: {
    contentTop: 0,
    contentH:   5.4,
    contentW:   8.0,
  },
};
