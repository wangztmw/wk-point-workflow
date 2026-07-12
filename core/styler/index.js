/**
 * styler/index.js — 模板风格提取器 CLI
 *
 * 用法：
 *   node core/styler/index.js template.png                    # 从截图提取背景
 *   node core/styler/index.js template.png --ai              # 用 AI 分析
 *   node core/styler/index.js template.png --output bg.json  # 指定输出路径
 *   node core/styler/index.js template.png --safe 60,40,880,440  # 手动设置安全区
 */

const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-bg');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
📐 模板风格提取器

用法:
  node core/styler/index.js <图片路径> [选项]

选项:
  --ai                 使用 Claude Vision API 自动分析（需要设置 ANTHROPIC_API_KEY 环境变量）
  --output <path>      输出路径（默认: ./bg.json）
  --safe top,left,w,h  手动设置内容安全区（如: --safe 60,40,880,440）

示例:
  node core/styler/index.js template.png
  node core/styler/index.js template.png --ai --output projects/demo-1/bg.json
  node core/styler/index.js template.png --safe 80,50,840,420
`);
    return;
  }

  const imagePath = path.resolve(args[0]);
  let outputPath = 'bg.json';
  let useAI = false;
  let manualSafeArea = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--ai') useAI = true;
    else if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    else if (args[i] === '--safe' && args[i + 1]) {
      const parts = args[++i].split(',').map(Number);
      if (parts.length === 4) {
        manualSafeArea = { top: parts[0], left: parts[1], width: parts[2], height: parts[3] };
      }
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || '';

  console.log('\n📐 模板风格提取器\n' + '─'.repeat(50));

  try {
    const result = await extract(imagePath, {
      useAI: useAI && !!apiKey,
      apiKey,
      manualSafeArea,
    });

    // 写入输出
    const outPath = path.resolve(outputPath);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`   ✅ 已生成: ${outPath}`);
    console.log(`   安全区: top=${result.safeArea.top} left=${result.safeArea.left} ${result.safeArea.width}×${result.safeArea.height}`);
    if (result.colors) {
      console.log(`   配色: primary=${result.colors.primary} accent=${result.colors.accent} bg=${result.colors.bg}`);
    }
    console.log('─'.repeat(50) + '\n');
  } catch (err) {
    console.error(`❌ 提取失败: ${err.message}`);
    process.exit(1);
  }
}

main();
