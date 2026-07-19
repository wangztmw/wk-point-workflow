/**
 * config.js — 主题预设 + 工具函数
 */

const path = require('path');
const PROJECTS_DIR = path.join(__dirname, '..', '..', 'projects');
const DEFAULT_PROJECT = 'demo-1';

const THEME_PRESETS = {
  default: {},
  dark: {
    theme: {
      primary: '#667eea', accent: '#e94560', success: '#2ecc71',
      warning: '#f39c12', bg: '#1a1a2e', text: '#e0e0ff',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
  },
  ocean: {
    theme: {
      primary: '#0ea5e9', accent: '#f97316', success: '#10b981',
      warning: '#eab308', bg: '#f0f9ff', text: '#0c4a6e',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    chartColors: ['#0ea5e9', '#f97316', '#10b981', '#eab308', '#6366f1'],
  },
  sunset: {
    theme: {
      primary: '#f97316', accent: '#ef4444', success: '#22c55e',
      warning: '#eab308', bg: '#fff7ed', text: '#431407',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    chartColors: ['#f97316', '#ef4444', '#22c55e', '#eab308', '#a855f7'],
  },
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = { PROJECTS_DIR, DEFAULT_PROJECT, THEME_PRESETS, deepMerge };
