/**
 * utils.js — 辅助函数
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PROJECTS_DIR } = require('./config');

function getProjectDirs() {
  return fs.readdirSync(PROJECTS_DIR).filter(d => {
    const full = path.join(PROJECTS_DIR, d);
    return fs.statSync(full).isDirectory() && !d.startsWith('.');
  });
}

function openInBrowser(name, file = 'slides.html') {
  const outputPath = path.join(PROJECTS_DIR, name, 'output', file);
  if (fs.existsSync(outputPath)) {
    exec(`open "${outputPath}"`);
    console.log('🌐 已在浏览器中打开');
  }
}

module.exports = { getProjectDirs, openInBrowser };
