/**
 * ppt-engine/image.js — 图片嵌入导出
 *
 * 底层技术：slide.addImage() 将 base64/URL 图片嵌入 PPTX。
 *
 * 适用模板：image-text（左右图文）/ image-full（全屏出血）/ image-grid（图矩阵）
 *
 * 对应 html-engine/index.js 中的函数：
 *   addImageTextSlidePptx, addImageFullSlidePptx, addImageGridSlidePptx
 *
 * 踩坑：
 *   - addImage 用 try/catch 包裹（图片 URL 可能加载失败）
 *   - image-full 需要叠加半透明黑色矩形模拟蒙版效果
 */
