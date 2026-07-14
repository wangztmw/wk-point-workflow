/**
 * ppt-engine/native-chart.js — 原生 OOXML 图表导出
 *
 * 底层技术：slide.addChart() 生成 OOXML <c:chart> 原生图表。
 * 每根柱子/扇区独立可选，双击打开内嵌数据表编辑数值。
 *
 * 适用模板：chart-bar / chart-pie / chart-line / chart-radar
 *           chart-pareto / chart-compare（降级为 bar）
 *
 * 对应 html-engine/index.js 中的函数：
 *   addNativeChartSlide — 6 种图表类型共用一个封装
 */
