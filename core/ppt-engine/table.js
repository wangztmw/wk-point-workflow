/**
 * ppt-engine/table.js — 三线表导出
 *
 * 底层技术：addTable() + 单格 border 数组 [上,右,下,左]。
 * 顶线3pt + 表头下线2pt + 底线3pt = 经典三线表。
 *
 * 适用模板：table
 *
 * 对应 html-engine/index.js 中的函数：
 *   addTableSlidePptx
 *
 * 踩坑：
 *   - PptxGenJS cell border 只认数组格式，不认对象
 *   - addTable 必须设 border:{type:'none'} 关闭默认全框
 */
