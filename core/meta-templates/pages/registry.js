/**
 * pages/registry.js — 页空间注册表
 */

var defs = require('./standard-page');

function pageDef(type) {
  return defs[type] || defs.content;
}

module.exports = { pageDef };
