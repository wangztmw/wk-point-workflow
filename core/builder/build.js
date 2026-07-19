/**
 * build.js — 构建逻辑：读文件 → 解析 → 渲染 → 输出
 */

const fs = require('fs');
const path = require('path');
const { parse, parseTag, detectTagSyntax } = require('../parser/assemble');
const { render } = require('../html-engine/assemble');
const { PROJECTS_DIR, THEME_PRESETS, deepMerge } = require('./config');

async function buildProject(name, themePreset) {
  const projectDir = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectDir)) { console.error(`❌ 项目 "${name}" 不存在`); return false; }

  console.log(`\n📁 构建项目: ${name}`);
  console.log('─'.repeat(50));

  const mdPath = path.join(projectDir, 'content.md');
  if (!fs.existsSync(mdPath)) { console.error('❌ 未找到 content.md'); return false; }
  const md = fs.readFileSync(mdPath, 'utf-8');
  console.log(`   📝 读取 content.md (${(md.length / 1024).toFixed(1)} KB)`);

  let config = {};
  const configPath = path.join(projectDir, 'config.json');
  if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); console.log('   ⚙  加载 config.json'); }
    catch (_) { console.warn('   ⚠  config.json 解析失败，使用默认配置'); }
  } else { console.log('   ⚙  使用默认配置（无 config.json）'); }

  await loadBackground(config, projectDir);

  config.projectDir = projectDir;
  if (themePreset && THEME_PRESETS[themePreset]) { config = deepMerge(config, THEME_PRESETS[themePreset]); console.log(`   🎨 应用主题: ${themePreset}`); }

  const useTag = detectTagSyntax(md);
  const slides = useTag ? parseTag(md) : parse(md);
  console.log(`   📊 解析完成: ${slides.length} 页幻灯片 (${useTag ? 'tag' : 'markdown'} 语法)`);
  const typeCount = {};
  slides.forEach(s => { typeCount[s.type] = (typeCount[s.type] || 0) + 1; console.log(`      [${s.index + 1}] ${s.type.padEnd(10)} ${(s.props.title || '').substring(0, 40)}`); });
  console.log(`   类型分布: ${Object.entries(typeCount).map(([k, v]) => `${k}×${v}`).join(', ')}`);

  console.log('   🎨 渲染 HTML...');
  const html = render(slides, config);
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

async function loadBackground(config, projectDir) {
  const bgPath = path.join(projectDir, 'bg.json');
  if (fs.existsSync(bgPath)) {
    try { config.background = JSON.parse(fs.readFileSync(bgPath, 'utf-8')); console.log('   🖼  加载 bg.json'); }
    catch (_) { console.warn('   ⚠  bg.json 解析失败'); }
    return;
  }
  const imgCandidates = ['background.png','background.jpg','background.jpeg','background.svg','template.png','template.jpg','template.jpeg','template.svg','bg.png','bg.jpg','bg.svg','template.pptx'];
  let foundImg = null;
  for (const dir of [path.join(projectDir, 'assets'), projectDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of imgCandidates) { const p = path.join(dir, name); if (fs.existsSync(p)) { foundImg = p; break; } }
    if (foundImg) break;
  }
  if (!foundImg) return;
  try {
    const { extract } = require('../../styler/extract-bg');
    config.background = await extract(foundImg);
    if (path.extname(foundImg).toLowerCase() === '.svg') {
      const { parse: parseSVG } = require('../../styler/to-shapes');
      const svgText = fs.readFileSync(foundImg, 'utf-8');
      const shapeData = parseSVG(svgText);
      config.background.elements = shapeData.elements;
      config.background.safeArea = shapeData.safeArea;
      console.log(`   🧩 SVG → ${shapeData.elements.length} 个矢量图形`);
    }
    fs.writeFileSync(bgPath, JSON.stringify(config.background, null, 2), 'utf-8');
    console.log(`   🖼  检测到 ${path.basename(foundImg)} → 自动提取背景 → 缓存 bg.json`);
  } catch (err) { console.warn(`   ⚠  背景提取失败: ${err.message}`); }
}

async function generateStyleguide(name, themePreset) {
  const { render } = require('../html-engine/assemble');
  const samples = require('./styleguide-data');
  samples.forEach((s, i) => { s.index = i; });
  let config = { title: '样式指南', chartColors: ['#667eea','#e94560','#2ecc71','#f39c12','#95a5a6'] };
  if (themePreset && THEME_PRESETS[themePreset]) config = deepMerge(config, THEME_PRESETS[themePreset]);
  const html = render(samples, config);
  const outDir = path.join(PROJECTS_DIR, name, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'styleguide.html'), html, 'utf-8');
  console.log(`\n📐 样式指南已生成: ${path.join(outDir, 'styleguide.html')}\n   共 ${samples.length} 种模板类型\n`);
}

module.exports = { buildProject, generateStyleguide };
