/**
 * registry.js — 模板注册表
 *
 * 幻灯片类型 → 模板文件路径的映射。
 * 路径相对于 core/templates/。
 *
 * 这是模板路由的唯一真相源。html-engine 从这里读取映射、
 * 拼接绝对路径后加载模板。加新类型只改这一个文件即可。
 */

const TEMPLATE_MAP = {
  // 页面模板（pages/slides/）
  'title':         'pages/slides/title.html.js',
  'content':       'pages/slides/content.html.js',
  'summary':       'pages/slides/summary.html.js',
  'two-column':    'pages/slides/two-column.html.js',
  'three-column':  'pages/slides/three-column.html.js',
  'toc':           'pages/slides/toc.html.js',
  'section':       'pages/slides/section.html.js',
  'ending':        'pages/slides/ending.html.js',
  'kpi-grid':      'pages/slides/kpi-grid.html.js',

  // 图表模板（pages/charts/）
  'chart':         'pages/charts/chart-bar.html.js',
  'chart-bar':     'pages/charts/chart-bar.html.js',
  'chart-pie':     'pages/charts/chart-pie.html.js',
  'chart-line':    'pages/charts/chart-line.html.js',
  'chart-radar':   'pages/charts/chart-radar.html.js',
  'chart-pareto':  'pages/charts/chart-pareto.js',
  'chart-compare': 'pages/charts/chart-compare.js',
  'chart-waterfall':  'pages/charts/chart-waterfall.js',
  'chart-waterfall2': 'pages/charts/chart-waterfall2.js',

  // 内容模板（pages/contents/）
  'table':         'pages/contents/table.html.js',
  'quote':         'pages/contents/quote.html.js',
  'timeline':      'pages/contents/timeline.html.js',

  // 图片模板（pages/contents/images/）
  'image-text':    'pages/contents/images/image-text.html.js',
  'image-full':    'pages/contents/images/image-full.html.js',
  'image-grid':    'pages/contents/images/image-grid.html.js',
  'image-gallery': 'pages/contents/images/image-gallery.js',

  // 标签语法
  'tag-slide':     'tag-renderer.js',
};

module.exports = { TEMPLATE_MAP };
