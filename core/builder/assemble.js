/**
 * assemble.js — CLI 编排
 *
 * 用法：node core/builder/assemble.js <name> [--all] [--open] [--watch] [--theme dark]
 */

const fs = require('fs');
const path = require('path');
const { PROJECTS_DIR, DEFAULT_PROJECT, THEME_PRESETS } = require('./config');
const { getProjectDirs, openInBrowser } = require('./utils');
const { buildProject, generateStyleguide } = require('./build');

async function main() {
  const args = process.argv.slice(2);
  let projectName = DEFAULT_PROJECT, buildAll = false, openBrowser = false, watchMode = false, themePreset = null, styleguide = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') buildAll = true;
    else if (args[i] === '--styleguide') { styleguide = true; if (args[i + 1] && !args[i + 1].startsWith('--')) projectName = args[++i]; }
    else if (args[i] === '--watch') { watchMode = true; if (args[i + 1] && !args[i + 1].startsWith('--')) projectName = args[++i]; }
    else if (args[i] === '--open') { openBrowser = true; if (args[i + 1] && !args[i + 1].startsWith('--')) projectName = args[++i]; }
    else if (args[i] === '--theme') themePreset = args[++i] || 'default';
    else if (!args[i].startsWith('--')) projectName = args[i];
  }

  if (styleguide) { await generateStyleguide(projectName, themePreset); if (openBrowser) openInBrowser(projectName, 'styleguide.html'); return; }

  if (buildAll) {
    const dirs = getProjectDirs();
    console.log(`\n🚀 构建所有项目（${dirs.length} 个）...\n`);
    for (const dir of dirs) await buildProject(dir, themePreset);
    console.log('✅ 全部完成！\n');
  } else {
    await buildProject(projectName, themePreset);
    if (openBrowser) openInBrowser(projectName);
  }

  if (watchMode) {
    const mdPath = path.join(PROJECTS_DIR, projectName, 'content.md');
    const configPath = path.join(PROJECTS_DIR, projectName, 'config.json');
    console.log(`\n👀 监听模式已启动\n   监听: ${mdPath}\n   按 Ctrl+C 退出\n`);
    let debounceTimer = null;
    const rebuild = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(async () => { console.log(`\n🔄 [${new Date().toLocaleTimeString()}] 检测到变化，重建中...`); await buildProject(projectName, themePreset); console.log('👀 继续监听...\n'); }, 300); };
    if (fs.existsSync(mdPath)) fs.watchFile(mdPath, rebuild);
    if (fs.existsSync(configPath)) fs.watchFile(configPath, rebuild);
  }
}

main().catch(err => { console.error('❌ 构建失败:', err.message); process.exit(1); });
