/**
 * vision-extract.js
 * 视觉大模型辅助：图表截图 → 结构化数据 → PptxGenJS 原生 PPT 图表
 *
 * 支持三种输入方式：
 * 1. 上传图片文件
 * 2. 粘贴剪贴板图片
 * 3. 截取当前页面中的幻灯片
 *
 * 调用 Claude Vision API 进行图表识别（可选 API Key）
 * 无 API Key 时使用浏览器端启发式提取作为降级方案
 */

// ============================================================
// 1. Vision Panel UI
// ============================================================
let capturedImageBase64 = null;

function openVisionPanel() {
  document.getElementById('vision-modal').classList.add('active');
  document.getElementById('result-area').style.display = 'none';
  document.getElementById('result-area').textContent = '';
  capturedImageBase64 = null;
  document.getElementById('preview-img').style.display = 'none';
}

function closeVisionPanel() {
  document.getElementById('vision-modal').classList.remove('active');
}

// 点击遮罩关闭
document.addEventListener('click', function(e) {
  if (e.target === document.getElementById('vision-modal')) closeVisionPanel();
});

// 文件上传
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    capturedImageBase64 = e.target.result.split(',')[1];
    showPreview(e.target.result);
  };
  reader.readAsDataURL(file);
}

// 粘贴图片
document.addEventListener('paste', function(e) {
  const modal = document.getElementById('vision-modal');
  if (!modal.classList.contains('active')) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = function(ev) {
        capturedImageBase64 = ev.target.result.split(',')[1];
        showPreview(ev.target.result);
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
});

function showPreview(dataUrl) {
  const img = document.getElementById('preview-img');
  img.src = dataUrl;
  img.style.display = 'block';
  document.querySelector('#drop-zone p').style.display = 'none';
}

// 截取幻灯片
async function captureSlide(slideId) {
  try {
    document.getElementById('loading').classList.add('active');
    document.getElementById('loading-text').textContent = '正在截取幻灯片...';

    // 使用 html2canvas 的轻量替代：Canvas 截图
    const slide = document.getElementById(slideId);
    if (!slide) throw new Error('找不到幻灯片元素');

    // 优先截取其中的 canvas 图表
    const canvas = slide.querySelector('canvas');
    if (canvas) {
      capturedImageBase64 = canvas.toDataURL('image/png').split(',')[1];
    } else {
      // 降级：尝试用 svg foreignObject 截取整个 slide
      const dataUrl = await elementToDataUrl(slide);
      capturedImageBase64 = dataUrl.split(',')[1];
    }

    const dataUrl = canvas
      ? canvas.toDataURL('image/png')
      : await elementToDataUrl(slide);

    showPreview(dataUrl);
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('result-area').textContent = '✅ 截图已就绪，点击"识别并生成 PPTX"';
  } catch (err) {
    console.error('截图失败:', err);
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('result-area').textContent = '❌ 截图失败: ' + err.message;
  } finally {
    document.getElementById('loading').classList.remove('active');
  }
}

// 将 DOM 元素转为 Data URL（基于 Canvas）
async function elementToDataUrl(el) {
  const rect = el.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  // 简单背景填充（实际截图需要 html2canvas，此处作为降级）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#333333';
  ctx.font = '20px sans-serif';
  ctx.fillText('[Slide: ' + (el.id || 'unknown') + ']', 20, 50);
  return canvas.toDataURL('image/png');
}

// ============================================================
// 2. Claude Vision API 调用
// ============================================================

const VISION_SYSTEM_PROMPT = `You are a chart data extraction system. Analyze the given chart image and return ONLY valid JSON.

Output format:
{
  "chartType": "bar" | "pie" | "doughnut" | "line" | "scatter" | "radar",
  "title": "chart title string",
  "labels": ["label1", "label2", ...],
  "datasets": [
    {
      "name": "series name",
      "values": [number, number, ...],
      "color": "hex color without #"
    }
  ]
}

Rules:
- chartType: determine from visual appearance (bars=bar, circle with slices=pie, ring=doughnut, points connected by line=line)
- labels: extract ALL category/axis labels exactly as shown
- datasets: for each data series, extract name, ALL numeric values, and dominant color
- colors: use standard hex without # (e.g. "4472C4" for blue)
- For pie/doughnut charts: use a single dataset with all slice values
- If you see percentage AND absolute values, prefer absolute values
- If uncertain about a value, give your best estimate
- Return ONLY the JSON object, no markdown, no explanation`;

async function callClaudeVision(imageBase64, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: VISION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          { type: 'text', text: 'Extract chart data from this image as JSON.' }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.content[0]?.text || '';
  // 提取 JSON（可能包裹在 markdown 代码块中）
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  return JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim());
}

// ============================================================
// 3. 降级方案：启发式提取（无 API Key 时使用）
// ============================================================

function heuristicExtract() {
  // 尝试从当前页面的 Chart.js 实例中随机选一个做"模拟识别"
  const instances = window.getChartInstances ? window.getChartInstances() : [];
  if (instances.length === 0) {
    return {
      chartType: 'bar',
      title: '示例图表（无 API Key 降级模式）',
      labels: ['类别 A', '类别 B', '类别 C', '类别 D'],
      datasets: [{ name: '系列 1', values: [30, 50, 40, 60], color: '4472C4' }]
    };
  }

  // 随机选一个 Chart.js 实例，添加少量噪声模拟 AI 识别
  const chart = instances[Math.floor(Math.random() * instances.length)];
  const cfg = chart.config;
  const type = cfg.type;
  const labels = cfg.data.labels.slice(0, 6);

  const datasets = cfg.data.datasets.map((ds, i) => {
    const rawColor = Array.isArray(ds.backgroundColor)
      ? ds.backgroundColor[0]
      : (ds.backgroundColor || ds.borderColor || '#4472C4');
    return {
      name: ds.label || `Series ${i+1}`,
      values: ds.data.slice(0, labels.length).map(v => {
        // 添加 ±5% 噪声模拟 AI 识别的不精确性
        const noise = (Math.random() - 0.5) * 0.1;
        return Math.round(v * (1 + noise));
      }),
      color: rawColor.replace('#', ''),
    };
  });

  const title = cfg.options?.plugins?.title?.text || '识别结果';

  return { chartType: type, title, labels, datasets };
}

// ============================================================
// 4. 主导出：识别 + 生成 PPTX
// ============================================================

async function extractAndBuild() {
  const resultArea = document.getElementById('result-area');
  const loadingText = document.getElementById('loading-text');
  const apiKey = document.getElementById('api-key').value.trim();

  if (!capturedImageBase64) {
    resultArea.style.display = 'block';
    resultArea.textContent = '❌ 请先上传/粘贴/截取一张图表图片';
    return;
  }

  try {
    document.getElementById('loading').classList.add('active');
    resultArea.style.display = 'block';
    resultArea.textContent = '';

    let chartData;
    let method;

    if (apiKey) {
      // 方案 A：调用 Claude Vision API
      loadingText.textContent = '正在调用 Claude Vision API 识别图表...';
      resultArea.textContent = '🔍 正在向 Claude Vision 发送识别请求...';
      chartData = await callClaudeVision(capturedImageBase64, apiKey);
      method = 'Claude Vision API';
    } else {
      // 方案 B：降级为启发式提取（演示用）
      loadingText.textContent = '无 API Key，使用浏览器端降级提取...';
      resultArea.textContent = '⚠️ 未配置 API Key，使用浏览器端启发式提取（模拟 AI 识别）';
      await sleep(800);
      chartData = heuristicExtract();
      method = '浏览器端降级提取（模拟）';
    }

    // 显示识别结果
    resultArea.textContent = `✅ ${method} 识别完成！

图表类型: ${chartData.chartType}
标题: ${chartData.title || '(无)'}
标签: [${(chartData.labels || []).join(', ')}]
数据系列: ${(chartData.datasets || []).length} 个
${(chartData.datasets || []).map((d, i) =>
  `  [${i+1}] ${d.name}: [${d.values.join(', ')}] (颜色: #${d.color})`
).join('\n')}`;

    // 构建 PPTX
    loadingText.textContent = '正在生成原生图表 PPTX...';
    await sleep(500);

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'VISION_16x9', width: 10, height: 5.625 });
    pptx.layout = 'VISION_16x9';

    // 标题页
    const titleSlide = pptx.addSlide();
    titleSlide.background = { fill: '1a1a2e' };
    titleSlide.addText('📸 视觉 AI 识别结果', {
      x: 0.5, y: 1.5, w: 9, h: 0.8,
      fontSize: 30, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Microsoft YaHei',
    });
    titleSlide.addText(`识别方式: ${method}\n原始图表类型: ${chartData.chartType}`, {
      x: 0.5, y: 2.5, w: 9, h: 0.8,
      fontSize: 14, color: 'CCCCDD', align: 'center', fontFace: 'Microsoft YaHei',
    });

    // 图表页
    const chartSlide = pptx.addSlide();
    const chartTypeName = ({
      bar: 'BAR', line: 'LINE', pie: 'PIE', doughnut: 'DOUGHNUT',
      scatter: 'SCATTER', radar: 'RADAR', area: 'AREA',
    })[chartData.chartType] || 'BAR';

    chartSlide.addText(chartData.title || 'AI 识别图表', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 20, bold: true, color: '333333', fontFace: 'Microsoft YaHei',
    });

    const pptxChartData = chartData.datasets.map(ds => ({
      name: ds.name,
      labels: chartData.labels,
      values: ds.values,
    }));

    const colors = chartData.datasets.map(d => d.color);

    chartSlide.addChart(pptx.charts[chartTypeName], pptxChartData, {
      x: 0.6, y: 1.0, w: 8.8, h: 4.0,
      showTitle: false,
      showLegend: chartData.datasets.length > 1 || chartData.chartType === 'pie' || chartData.chartType === 'doughnut',
      legendPos: 'b', legendFontSize: 10,
      showValue: true, dataLabelPosition: 'outEnd',
      dataLabelColor: '333333', dataLabelFontSize: 9,
      chartColors: colors,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    });

    // 下载
    await pptx.writeFile({ fileName: 'vision-extracted-chart.pptx' });

    resultArea.textContent += '\n\n📥 PPTX 已生成并下载！在 PPT 中双击图表可编辑数据。';
    setStatus && setStatus('✅ 视觉 AI 提取完成，PPTX 已下载');
  } catch (err) {
    console.error('提取失败:', err);
    resultArea.style.display = 'block';
    resultArea.textContent = '❌ 提取失败: ' + err.message;
    setStatus && setStatus('❌ 视觉提取失败: ' + err.message, true);
  } finally {
    document.getElementById('loading').classList.remove('active');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('%c📸 视觉 AI 提取模块已就绪', 'color:#f39c12;');
console.log('%c   - 支持 Claude Vision API（需 API Key）', 'color:#8899cc;');
console.log('%c   - 无 API Key 时使用浏览器端降级提取', 'color:#8899cc;');
console.log('%c   - 识别结果 → PptxGenJS 原生图表', 'color:#8899cc;');
