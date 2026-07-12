/**
 * export.js — HTML 幻灯片 → 可编辑 PPTX 导出逻辑
 * 依赖：dom-to-pptx (CDN) + Chart.js (CDN)
 */

// ============================================================
// 1. 初始化 Chart.js 图表
// ============================================================

// ---- 柱状图（Slide 3） ----
const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: '产品 A', data: [120, 145, 168, 192], backgroundColor: '#667eea', borderRadius: 6 },
      { label: '产品 B', data: [85, 102, 125, 148], backgroundColor: '#e94560', borderRadius: 6 },
      { label: '产品 C', data: [60, 78, 92, 110], backgroundColor: '#2ecc71', borderRadius: 6 },
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: '季度销售额（万元）', font: { size: 16 }, color: '#333' },
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { callback: v => v + '万' } },
      x: { grid: { display: false } }
    }
  }
});

// ---- 饼图（Slide 4 left） ----
const pieCtx = document.getElementById('pieChart').getContext('2d');
new Chart(pieCtx, {
  type: 'pie',
  data: {
    labels: ['竞品 A', '竞品 B', '竞品 C', '其他'],
    datasets: [{
      data: [35, 28, 22, 15],
      backgroundColor: ['#667eea', '#e94560', '#2ecc71', '#f39c12'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: '市场份额分布 (%)', font: { size: 14 }, color: '#333' },
      legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } }
    }
  }
});

// ---- 环形图（Slide 4 right） ----
const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
new Chart(doughnutCtx, {
  type: 'doughnut',
  data: {
    labels: ['搜索引擎', '社交媒体', '直接访问', '邮件营销', '其他'],
    datasets: [{
      data: [40, 25, 18, 12, 5],
      backgroundColor: ['#667eea', '#e94560', '#2ecc71', '#f39c12', '#95a5a6'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: '用户来源渠道', font: { size: 14 }, color: '#333' },
      legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } }
    }
  }
});

// ============================================================
// 2. 导出函数
// ============================================================

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = isError ? '#e94560' : '#8899aa';
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('active', show);
}

/**
 * 导出所有幻灯片为 PPTX
 * dom-to-pptx 的 exportToPptx 接受元素数组实现多页导出
 */
async function exportPPT() {
  try {
    setStatus('⏳ 正在生成...');
    showLoading(true);

    // 收集所有幻灯片元素（必须转为 Array，NodeList 不支持 getBoundingClientRect）
    const slides = Array.from(document.querySelectorAll('.slide'));

    // 调用 dom-to-pptx 导出
    // svgAsVector: true 使 SVG 元素以矢量形式嵌入，PPT 中可"转换为形状"编辑
    await domToPptx.exportToPptx(slides, {
      fileName: 'html-to-editable-ppt.pptx',
      svgAsVector: true,        // SVG 保持矢量（可在 PPT 中转为形状编辑）
      autoEmbedFonts: true,     // 自动嵌入检测到的字体
      layout: 'LAYOUT_16x9',    // 16:9 宽屏
    });

    setStatus('✅ 导出成功！在 PowerPoint/WPS 中打开 .pptx 文件即可编辑每个元素');
  } catch (err) {
    console.error('导出失败:', err);
    setStatus('❌ 导出失败: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

/**
 * 生成 Blob 但不自动下载（用于调试或自定义处理）
 */
async function exportPPTNoDownload() {
  try {
    setStatus('⏳ 正在生成 Blob...');
    showLoading(true);

    const slides = Array.from(document.querySelectorAll('.slide'));
    const blob = await domToPptx.exportToPptx(slides, {
      fileName: 'output.pptx',
      svgAsVector: true,
      autoEmbedFonts: true,
      layout: 'LAYOUT_16x9',
      skipDownload: true,       // 不自动下载，返回 Blob
    });

    // 手动触发下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.pptx';
    a.click();
    URL.revokeObjectURL(url);

    setStatus('✅ Blob 生成完毕并触发下载 (' + (blob.size / 1024).toFixed(1) + ' KB)');
  } catch (err) {
    console.error('生成失败:', err);
    setStatus('❌ 失败: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

// ============================================================
// 3. 打印版本信息到控制台
// ============================================================
console.log('%c🔬 HTML → PPT 可编辑转换演示已就绪 %c| %cdom-to-pptx v1.1.5',
  'font-size:16px;color:#667eea;', '', 'color:#888;');
console.log('%c📌 提示：点击顶部"导出为 PPTX"按钮即可生成可编辑的 PowerPoint 文件',
  'color:#2ecc71;');
console.log('%c📌 SVG 元素（Slide 5）导出后在 PPT 中右键 → "转换为形状"即可编辑',
  'color:#f39c12;');
console.log('%c📌 Canvas 图表（Slide 3/4）导出为图片，如需可编辑图表请使用 SVG 渲染',
  'color:#f39c12;');
