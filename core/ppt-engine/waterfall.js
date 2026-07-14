/**
 * ppt-engine/waterfall.js — 瀑布图形状拼凑导出
 *
 * 底层技术：addShape('rect') 逐根画柱子 + addShape('line') 虚线连接。
 * PptxGenJS 没有 waterfall 图表类型，必须手动构建。
 * 每根柱子 = 独立矩形，可在 PPT 中自由拖拽/改色/缩放。
 *
 * 适用模板：chart-waterfall / chart-waterfall2
 *
 * 对应 html-engine/index.js 中的函数：
 *   addWaterfallShapes — 统一处理单段+分段瀑布图
 *   isWaterfallType   — 检测是否为瀑布图类型
 *   isSubtotalRow     — 检测合计行（含"合计/小计/汇总/总计"）
 *   drawBackgroundShapes — 画矢量背景装饰
 *
 * 颜色规范：
 *   落地柱（起点/终点/合计）= #2563EB（Royal Blue）
 *   增量柱 = #16A34A（Bright Green）
 *   减量柱 = #DC2626（Alert Red）
 *
 * 踩坑：
 *   - 不能走 dom-to-pptx（stack 机制会塌缩）
 *   - 连接线：增量/落地柱连顶部，减量柱连底部
 *   - Y轴范围 = 中间累计最大值 × 1.08
 */
