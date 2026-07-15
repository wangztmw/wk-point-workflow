/**
 * build.js — CLI 构建脚本
 *
 * 用法：
 *   node core/build.js <name>          构建指定项目
 *   node core/build.js --all            构建所有项目
 *   node core/build.js --watch <name>   监听模式，文件变化自动重建
 *   node core/build.js --open <name>    构建并在浏览器中打开
 *   node core/build.js --theme dark    使用指定主题预设
 *
 * 流程：
 *   content.md → parser.js → SlideAST[] → renderer.js → slides.html
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('../parser');
const { render } = require('../html-engine');

const PROJECTS_DIR = path.join(__dirname, '..', '..', 'projects');
const DEFAULT_PROJECT = 'demo-1';

// 主题预设
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

// ============================================================
// 主流程
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  let projectName = DEFAULT_PROJECT;
  let buildAll = false;
  let openBrowser = false;
  let watchMode = false;
  let themePreset = null;
  let styleguide = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') {
      buildAll = true;
    } else if (args[i] === '--styleguide') {
      styleguide = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) projectName = args[++i];
    } else if (args[i] === '--watch') {
      watchMode = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        projectName = args[++i];
      }
    } else if (args[i] === '--open') {
      openBrowser = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        projectName = args[++i];
      }
    } else if (args[i] === '--theme') {
      themePreset = args[++i] || 'default';
    } else if (!args[i].startsWith('--')) {
      projectName = args[i];
    }
  }

  if (styleguide) {
    await generateStyleguide(projectName, themePreset);
    if (openBrowser) openInBrowser(projectName, 'styleguide.html');
    return;
  }

  if (buildAll) {
    const dirs = getProjectDirs();
    console.log(`\n🚀 构建所有项目（${dirs.length} 个）...\n`);
    for (const dir of dirs) {
      await buildProject(dir, themePreset);
    }
    console.log('✅ 全部完成！\n');
  } else {
    await buildProject(projectName, themePreset);
    if (openBrowser) openInBrowser(projectName);
  }

  // 监听模式
  if (watchMode) {
    const mdPath = path.join(PROJECTS_DIR, projectName, 'content.md');
    const configPath = path.join(PROJECTS_DIR, projectName, 'config.json');

    console.log(`\n👀 监听模式已启动，修改文件后自动重建...`);
    console.log(`   监听: ${mdPath}`);
    console.log(`   按 Ctrl+C 退出\n`);

    // 使用 fs.watchFile 兼容所有平台
    let debounceTimer = null;
    const rebuild = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const now = new Date().toLocaleTimeString();
        console.log(`\n🔄 [${now}] 检测到变化，重建中...`);
        await buildProject(projectName, themePreset);
        console.log(`👀 继续监听...\n`);
      }, 300); // 300ms 防抖
    };

    if (fs.existsSync(mdPath)) fs.watchFile(mdPath, rebuild);
    if (fs.existsSync(configPath)) fs.watchFile(configPath, rebuild);
  }
}

// ============================================================
// 构建单个项目
// ============================================================

async function buildProject(name, themePreset) {
  const projectDir = path.join(PROJECTS_DIR, name);

  if (!fs.existsSync(projectDir)) {
    console.error(`❌ 项目 "${name}" 不存在: ${projectDir}`);
    return false;
  }

  console.log(`\n📁 构建项目: ${name}`);
  console.log('─'.repeat(50));

  // 1. 读取 content.md
  const mdPath = path.join(projectDir, 'content.md');
  if (!fs.existsSync(mdPath)) {
    console.error(`❌ 未找到 content.md`);
    return false;
  }
  const md = fs.readFileSync(mdPath, 'utf-8');
  console.log(`   📝 读取 content.md (${(md.length / 1024).toFixed(1)} KB)`);

  // 2. 读取并合并配置
  let config = {};
  const configPath = path.join(projectDir, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`   ⚙  加载 config.json`);
    } catch (err) {
      console.warn(`   ⚠  config.json 解析失败，使用默认配置`);
    }
  } else {
    console.log(`   ⚙  使用默认配置（无 config.json）`);
  }

  // 2b. 背景模板：优先 bg.json，其次自动检测图片/PPT模板
  const bgPath = path.join(projectDir, 'bg.json');
  if (fs.existsSync(bgPath)) {
    try {
      config.background = JSON.parse(fs.readFileSync(bgPath, 'utf-8'));
      console.log(`   🖼  加载 bg.json（背景模板）`);
    } catch (err) { console.warn(`   ⚠  bg.json 解析失败`); }
  } else {
    // 自动检测 assets/ 或项目根目录里的背景图/模板
    const imgCandidates = ['background.png', 'background.jpg', 'background.jpeg', 'background.svg', 'template.png', 'template.jpg', 'template.jpeg', 'template.svg', 'bg.png', 'bg.jpg', 'bg.svg', 'template.pptx'];
    let foundImg = null;
    const searchDirs = [path.join(projectDir, 'assets'), projectDir];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      for (const name of imgCandidates) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) { foundImg = p; break; }
      }
      if (foundImg) break;
    }
    if (foundImg) {
      try {
        const { extract } = require('../styler/extract-bg');
        config.background = await extract(foundImg);
        // SVG 额外转为矢量图形
        var ext = path.extname(foundImg).toLowerCase();
        if (ext === '.svg') {
          var { parse: parseSVG } = require('../styler/to-shapes');
          var svgText = fs.readFileSync(foundImg, 'utf-8');
          var shapeData = parseSVG(svgText);
          config.background.elements = shapeData.elements;
          config.background.safeArea = shapeData.safeArea;
          console.log(`   🧩 SVG → ${shapeData.elements.length} 个矢量图形`);
        }
        fs.writeFileSync(bgPath, JSON.stringify(config.background, null, 2), 'utf-8');
        console.log(`   🖼  检测到 ${path.basename(foundImg)} → 自动提取背景 → 缓存 bg.json`);
      } catch (err) { console.warn(`   ⚠  背景提取失败: ${err.message}`); }
    }
  }

  // 3. 注入项目目录（供图片文件夹解析用）
  config.projectDir = projectDir;

  // 4. 应用主题预设
  if (themePreset && THEME_PRESETS[themePreset]) {
    config = deepMerge(config, THEME_PRESETS[themePreset]);
    console.log(`   🎨 应用主题: ${themePreset}`);
  }

  // 4. 解析 Markdown
  const slides = parse(md);
  console.log(`   📊 解析完成: ${slides.length} 页幻灯片`);

  const typeCount = {};
  slides.forEach(s => {
    typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    const title = s.props.title || (s.content.headings[0]?.text || '').substring(0, 40);
    console.log(`      [${s.index + 1}] ${s.type.padEnd(10)} ${title}`);
  });
  console.log(`   类型分布: ${Object.entries(typeCount).map(([k, v]) => `${k}×${v}`).join(', ')}`);

  // 5. 渲染 HTML
  console.log(`   🎨 渲染 HTML...`);
  const html = render(slides, config);

  // 6. 写入输出
  const outputDir = path.join(projectDir, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'slides.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`   ✅ 已生成: output/slides.html (${(html.length / 1024).toFixed(1)} KB)`);

  console.log('─'.repeat(50));
  console.log(`   输出: ${outputPath}`);
  console.log(`   预览: 在浏览器中打开 output/slides.html 即可预览和导出\n`);

  return true;
}

// ============================================================
// 辅助函数
// ============================================================

function getProjectDirs() {
  return fs.readdirSync(PROJECTS_DIR).filter(d => {
    const full = path.join(PROJECTS_DIR, d);
    return fs.statSync(full).isDirectory() && !d.startsWith('.');
  });
}

function openInBrowser(name, file = 'slides.html') {
  const outputPath = path.join(PROJECTS_DIR, name, 'output', file);
  if (fs.existsSync(outputPath)) {
    const { exec } = require('child_process');
    exec(`open "${outputPath}"`);
    console.log('🌐 已在浏览器中打开');
  }
}

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

// ============================================================
// 执行
// ============================================================

async function generateStyleguide(name, themePreset) {
  const { render } = require('../html-engine');
  const samples = require('./styleguide-data');

  // 加 index
  samples.forEach((s, i) => { s.index = i; });
  // 应用主题
  let config = { title: '样式指南', chartColors: ['#667eea','#e94560','#2ecc71','#f39c12','#95a5a6'] };
  if (themePreset && THEME_PRESETS[themePreset]) config = deepMerge(config, THEME_PRESETS[themePreset]);
  const html = render(samples, config);
  const outDir = path.join(PROJECTS_DIR, name, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'styleguide.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`\n📐 样式指南已生成: ${outPath}`);
  console.log(`   共 ${samples.length} 种模板类型\n`);
}

main().catch(err => {
  console.error('❌ 构建失败:', err.message);
  process.exit(1);
});
