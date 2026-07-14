/**
 * ppt-engine/text-layout.js — 手动布局导出
 *
 * 底层技术：addText() + addShape('rect') 手动定位文字和形状。
 * 适用模板：title / content / summary / two-column / three-column
 *           kpi-grid / toc / section / ending / quote / fallback
 *
 * 对应 html-engine/index.js 中的函数：
 *   addTitleSlidePptx, addContentSlidePptx, addSummarySlidePptx,
 *   addTwoColumnSlidePptx, addThreeColSlidePptx, addTocSlidePptx,
 *   addSectionSlidePptx, addEndingSlidePptx, addQuoteSlidePptx,
 *   addKpiGridSlidePptx, addFallbackSlidePptx
 */
