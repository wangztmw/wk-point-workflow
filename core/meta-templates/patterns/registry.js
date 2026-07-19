/**
 * patterns/registry.js — 布局注册表（name → arrange 函数）
 *
 * 加新布局：在此文件加一行即可。layout/assemble.js 自动读取。
 */

module.exports = {
  stack:   require('./stack/arrange'),
  split:   require('./split/arrange'),
  grid:    require('./grid/arrange'),
  masonry: require('./masonry/arrange'),
};
