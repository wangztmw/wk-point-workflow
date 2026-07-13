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
const { render } = require('../renderer');

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

  // 3. 应用主题预设
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

  // 同时生成原生 PPTX（如果 exporter 可用）
  try {
    const { exportToFile } = require('../exporter');
    const pptxPath = path.join(outputDir, 'slides-native.pptx');
    await exportToFile(slides, config, pptxPath);
    console.log(`   ✅ 原生 PPTX: output/slides-native.pptx\n`);
  } catch (err) {
    // exporter 可选，不强制
  }

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
  const { render } = require('../renderer');
  // 为每种模板类型构造示例 AST
  const samples = [
    { type:'title', props:{title:'封面页示例'}, content:{headings:[{level:1,text:'样式指南'},{level:2,text:'全部模板预览'}],paragraphs:[{text:'构建日期: '+new Date().toLocaleDateString()}],lists:[],table:null,raw:''} },
    { type:'toc', props:{title:'目录'}, content:{headings:[{level:2,text:'目录'},{level:2,text:'封面'},{level:2,text:'过渡页'},{level:2,text:'内容页'},{level:2,text:'图表页'},{level:2,text:'总结页'},{level:2,text:'结束页'}],paragraphs:[],lists:[],table:null,raw:''} },
    { type:'section', props:{title:'第一部分'}, content:{headings:[{level:1,text:'第一部分'},{level:2,text:'章节副标题'}],paragraphs:[],lists:[],table:null,raw:''} },
    { type:'content', props:{title:'内容页'}, content:{headings:[{level:2,text:'关键要点'}],paragraphs:[],lists:[{ordered:false,items:[{text:'第一项要点说明',inlineMarkup:[{type:'text',value:'第一项要点说明'}]},{text:'第二项要点说明 **粗体强调**',inlineMarkup:[{type:'text',value:'第二项要点说明 '},{type:'bold',content:[{type:'text',value:'粗体强调'}]}]}]}],table:null,raw:''} },
    { type:'summary', props:{title:'总结页'}, content:{headings:[{level:2,text:'核心结论'},{level:3,text:'✅ 达成'},{level:3,text:'⚠ 注意'},{level:3,text:'🎯 计划'}],lists:[{ordered:false,items:[{text:'成果一',inlineMarkup:[{type:'text',value:'成果一'}]}]},{ordered:false,items:[{text:'问题一',inlineMarkup:[{type:'text',value:'问题一'}]}]},{ordered:false,items:[{text:'行动一',inlineMarkup:[{type:'text',value:'行动一'}]}]}],paragraphs:[],table:null,raw:''} },
    { type:'two-column', props:{title:'两栏布局'}, content:{headings:[{level:2,text:'对比分析'},{level:3,text:'优势'},{level:3,text:'挑战'}],lists:[{ordered:false,items:[{text:'优势项一',inlineMarkup:[{type:'text',value:'优势项一'}]},{text:'优势项二',inlineMarkup:[{type:'text',value:'优势项二'}]},{text:'挑战项一',inlineMarkup:[{type:'text',value:'挑战项一'}]},{text:'挑战项二',inlineMarkup:[{type:'text',value:'挑战项二'}]}]}],paragraphs:[],table:null,raw:''} },
    { type:'chart', props:{chartType:'bar',title:'柱状图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['季度','产品A','产品B'],rows:[['Q1','120','85'],['Q2','145','102'],['Q3','168','125'],['Q4','192','148']]},raw:''} },
    { type:'chart', props:{chartType:'pie',title:'饼图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['渠道','占比'],rows:[['搜索','40'],['社交','25'],['直接','18'],['邮件','12'],['其他','5']]},raw:''} },
    { type:'chart', props:{chartType:'line',title:'折线图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['月份','DAU'],rows:[['1月','120'],['2月','145'],['3月','168'],['4月','192'],['5月','220'],['6月','255']]},raw:''} },
    { type:'chart', props:{chartType:'radar',title:'雷达图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['维度','产品A','产品B'],rows:[['性能','92','75'],['稳定','88','90'],['易用','78','92'],['安全','95','70'],['扩展','85','80']]},raw:''} },
    { type:'chart', props:{chartType:'pareto',title:'帕累托图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['原因','次数'],rows:[['操作失误','85'],['设计缺陷','52'],['硬件故障','38'],['环境因素','18'],['其他','7']]},raw:''} },
    { type:'chart', props:{chartType:'compare',title:'对比图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['指标','2023','2024'],rows:[['营收','580','680'],['用户','12.8','15.2'],['客单价','456','520']]},raw:''} },
    { type:'chart', props:{chartType:'waterfall',title:'瀑布图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['阶段','金额'],rows:[['起始','500'],['+A','+120'],['-B','-80'],['+C','+60'],['结束','600']]},raw:''} },
    { type:'chart', props:{chartType:'waterfall2',title:'分段瀑布图'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['阶段','金额'],rows:[['起始','500'],['+A','+150'],['-B','-60'],['合计','590'],['+C','+80'],['结束','670']]},raw:''} },
    { type:'table', props:{title:'数据表格'}, content:{headings:[{level:2,text:'季度数据'}],paragraphs:[],lists:[],table:{headers:['季度','营收','利润','利润率'],rows:[['Q1','580','120','20.7%'],['Q2','680','145','21.3%'],['Q3','750','168','22.4%'],['Q4','820','192','23.4%']]},raw:''} },
    { type:'three-column', props:{title:'三栏卡片'}, content:{headings:[{level:2,text:'三大核心优势'},{level:3,text:'技术领先'},{level:3,text:'成本可控'},{level:3,text:'快速落地'}],lists:[{ordered:false,items:[{text:'端侧AI芯片',inlineMarkup:[{type:'text',value:'端侧AI芯片'}]},{text:'光波导显示',inlineMarkup:[{type:'text',value:'光波导显示'}]},{text:'BOM仅¥1,152',inlineMarkup:[{type:'text',value:'BOM仅¥1,152'}]},{text:'毛利率47%',inlineMarkup:[{type:'text',value:'毛利率47%'}]},{text:'3-6个月上市',inlineMarkup:[{type:'text',value:'3-6个月上市'}]},{text:'贴牌模式',inlineMarkup:[{type:'text',value:'贴牌模式'}]}]}],paragraphs:[],table:null,raw:''} },
    { type:'kpi-grid', props:{title:'KPI概览'}, content:{headings:[],paragraphs:[],lists:[],table:{headers:['指标','数值','趋势'],rows:[['总营收','¥12,800万','↑ +18%'],['活跃用户','128万','↑ +5%'],['客单价','¥456','↑ +8%'],['NPS评分','72分','↑ +3分']]},raw:''} },
    { type:'image-text', props:{title:'图文混排'}, content:{headings:[{level:2,text:'产品展示'}],paragraphs:[{text:'这是一段产品描述文字，说明图片展示的内容'}],lists:[{ordered:false,items:[{text:'特性一：高质量材质',inlineMarkup:[{type:'text',value:'特性一：高质量材质'}]},{text:'特性二：人体工学设计',inlineMarkup:[{type:'text',value:'特性二：人体工学设计'}]},{text:'特性三：AI智能交互',inlineMarkup:[{type:'text',value:'特性三：AI智能交互'}]}]}],images:[{alt:'示例图片',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPlNhbXBsZSBJbWFnZTwvdGV4dD48L3N2Zz4K'}],table:null,raw:''} },
    { type:'image-full', props:{title:'全屏图文'}, content:{headings:[{level:1,text:'沉浸式体验'},{level:2,text:'重新定义出行方式'}],paragraphs:[{text:'岚图AI眼镜 · 130英寸虚拟巨幕'}],images:[{alt:'bg',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NjAiIGhlaWdodD0iNTQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxYTFhMmUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwZjM0NjAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iOTYwIiBoZWlnaHQ9IjU0MCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg=='}],lists:[],table:null,raw:''} },
    { type:'image-grid', props:{title:'图片矩阵'}, content:{headings:[{level:2,text:'产品图集'},{level:3,text:'产品A'},{level:3,text:'产品B'},{level:3,text:'产品C'},{level:3,text:'产品D'}],images:[{alt:'img1',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+SW1hZ2UgQTwvdGV4dD48L3N2Zz4K'},{alt:'img2',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U5NDU2MCIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+SW1hZ2UgQjwvdGV4dD48L3N2Zz4K'},{alt:'img3',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJlY2M3MSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+SW1hZ2UgQzwvdGV4dD48L3N2Zz4K'},{alt:'img4',src:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzOWMxMiIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+SW1hZ2UgRDwvdGV4dD48L3N2Zz4K'}],paragraphs:[],lists:[],table:null,raw:''} },
    { type:'quote', props:{title:'引用页'}, content:{headings:[{level:1,text:'千里之行，始于足下'},{level:2,text:'老子'}],paragraphs:[],lists:[],table:null,raw:''} },
    { type:'ending', props:{title:'结束页'}, content:{headings:[{level:1,text:'谢谢'}],paragraphs:[{text:'contact@company.com'}],lists:[],table:null,raw:''} },
  ];

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
