/**
 * config.js — 默认配置 + 合并
 */

const DEFAULT_CONFIG = {
  title: '演示文稿',
  layout: '16x9',
  width: 960,
  height: 540,
  theme: {
    primary: '#667eea',
    accent: '#e94560',
    success: '#2ecc71',
    warning: '#f39c12',
    bg: '#ffffff',
    text: '#222222',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  chartColors: ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'],
  export: {
    svgAsVector: true,
    autoEmbedFonts: true,
  },
};

function mergeConfig(userConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme: { ...DEFAULT_CONFIG.theme, ...(userConfig.theme || {}) },
    export: { ...DEFAULT_CONFIG.export, ...(userConfig.export || {}) },
    chartColors: userConfig.chartColors || DEFAULT_CONFIG.chartColors,
  };
}

module.exports = { DEFAULT_CONFIG, mergeConfig };
