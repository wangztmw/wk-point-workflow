/**
 * extract-bg.js — 背景提取器
 *
 * 输入：图片路径（公司 PPT 模板截图）
 * 输出：{ backgroundImage: base64, safeArea: {...}, colors: {...} }
 *
 * 支持两种模式：
 *   1. 纯本地：图片 → base64，safeArea 手动设置或使用默认值
 *   2. AI 分析（可选）：调用 Claude Vision API 自动识别安全区 + 主题色
 */

const fs = require('fs');
const path = require('path');

/**
 * 提取背景信息
 * @param {string} imagePath - 图片文件路径
 * @param {Object} opts - { useAI, apiKey, manualSafeArea }
 * @returns {Object} bgConfig
 */
async function extract(imagePath, opts = {}) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`图片不存在: ${imagePath}`);
  }

  // 1. 读取图片 → base64
  const ext = path.extname(imagePath).toLowerCase().slice(1);
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
  const mime = mimeMap[ext] || 'image/png';
  const buffer = fs.readFileSync(imagePath);
  const base64 = `data:${mime};base64,${buffer.toString('base64')}`;

  console.log(`   🖼  图片: ${path.basename(imagePath)} (${(buffer.length / 1024).toFixed(1)} KB) → base64`);

  // 2. AI 分析（可选）
  let aiResult = null;
  if (opts.useAI && opts.apiKey) {
    try {
      aiResult = await analyzeWithAI(base64, mime, opts.apiKey);
      console.log(`   🤖 AI 分析完成`);
    } catch (err) {
      console.warn(`   ⚠  AI 分析失败: ${err.message}，使用默认安全区`);
    }
  }

  // 3. 组装结果
  const safeArea = (opts.manualSafeArea && opts.manualSafeArea.width)
    ? opts.manualSafeArea
    : (aiResult ? aiResult.safeArea : defaultSafeArea());

  const colors = aiResult ? aiResult.colors : null;

  return {
    backgroundImage: base64,
    safeArea,
    colors,
    description: aiResult ? aiResult.description : '（手动设置安全区，未使用 AI 分析）',
  };
}

// ============================================================
// 默认安全区（960×540 幻灯片，假设顶部 60px 页眉 + 底部 40px 页脚）
// ============================================================

function defaultSafeArea() {
  return { top: 60, left: 40, width: 880, height: 440 };
}

// ============================================================
// Claude Vision API 分析
// ============================================================

async function analyzeWithAI(base64, mime, apiKey) {
  const mediaType = mime;
  const imgData = base64.split(',')[1]; // 去掉 data:...;base64, 前缀

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imgData },
          },
          {
            type: 'text',
            text: `这是一张 PPT 幻灯片模板的截图。请分析这张幻灯片的布局，返回严格的 JSON 格式（不要 markdown 包裹）：

{
  "safeArea": { "top": 页眉高度px, "left": 左边距px, "width": 内容区宽度px, "height": 内容区高度px },
  "colors": { "primary": "#主色调", "accent": "#辅色调", "bg": "#背景色", "text": "#文字色" },
  "chartColors": ["#图表色1", "#图表色2", "#图表色3", "#图表色4"],
  "description": "一句话描述风格"
}

注意：
- safeArea 是放正文/图表的安全区域（排除页眉页脚装饰区），基于 960×540 的幻灯片尺寸
- 如果图片不是正好 960×540，请按比例换算
- colors 从背景、装饰元素、文字中提取
- 只返回 JSON，不要其他文字`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // 尝试从回复中提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回中未找到 JSON');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { extract, defaultSafeArea };
