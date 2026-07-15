/**
 * waterfall.js — 瀑布图元素
 *
 * render(rows, title, chartId, style) → ECharts 瀑布图 HTML
 * rows: [{name, value}] — 第一行=起始，最后行=结束，中间=增减
 *
 * 特性：浮动柱 + 虚线连接 + 摘要栏 + formatter 重绑定
 */
const { esc } = require('../shared/escape');
const { styleToHtml } = require('../../../utils/coordinates');

function render(rows, title, chartId, style) {
  if (!rows || rows.length < 3) {
    return `<div style="padding:40px;color:#999;text-align:center;">瀑布图数据不足（至少需要起始+1个变化+结束）</div>`;
  }

  const rawData = rows.map(r => ({ name: r.name, value: Number(r.value) || 0 }));
  const cats = [];
  const baseSeries = [];
  const increaseSeries = [];
  const decreaseSeries = [];
  const linePoints = [];

  let runningTotal = 0;
  rawData.forEach((d, i) => {
    cats.push(d.name);
    if (i === 0) {
      const v = Math.abs(d.value);
      baseSeries.push(0);
      increaseSeries.push({ value: v, itemStyle: { color: '#2563EB', borderRadius: [4, 4, 0, 0] } });
      decreaseSeries.push(0);
      runningTotal = d.value;
      linePoints.push(runningTotal);
    } else if (i === rawData.length - 1) {
      baseSeries.push(0);
      increaseSeries.push({ value: d.value, itemStyle: { color: '#2563EB', borderRadius: [4, 4, 0, 0] } });
      decreaseSeries.push(0);
      linePoints.push(d.value);
    } else {
      const delta = d.value;
      if (delta >= 0) {
        baseSeries.push(runningTotal);
        increaseSeries.push({ value: delta, itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0] } });
        decreaseSeries.push(0);
      } else {
        baseSeries.push(runningTotal + delta);
        increaseSeries.push(0);
        decreaseSeries.push({ value: Math.abs(delta), itemStyle: { color: '#DC2626', borderRadius: [4, 4, 0, 0] } });
      }
      runningTotal += delta;
      linePoints.push(runningTotal);
    }
  });

  // Y 轴范围
  let cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (let i = 1; i < rawData.length - 1; i++) { cumVal += rawData[i].value; if (cumVal > cumMax) cumMax = cumVal; }
  const endVal = rawData[rawData.length - 1].value;
  if (endVal > cumMax) cumMax = endVal;
  const yMax = Math.ceil(cumMax * 1.08);

  const titleText = title || '瀑布图';
  const option = {
    title: { text: titleText, left: 'center', top: 8, textStyle: { fontSize: 16, color: '#333' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      // formatter 在 script 中重新绑定
      formatter: function(p) { return ''; }
    },
    legend: { bottom: 8, textStyle: { fontSize: 10 }, data: ['增长', '减少'], selectedMode: false },
    grid: { left: '8%', right: '8%', top: '20%', bottom: '18%' },
    xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 10, color: '#666', rotate: cats.length > 6 ? 25 : 0 }, axisTick: { show: false } },
    yAxis: { type: 'value', max: yMax, axisLabel: { fontSize: 10, color: '#888' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: '底座', type: 'bar', stack: 'waterfall', data: baseSeries, itemStyle: { color: 'transparent' }, label: { show: false }, emphasis: { itemStyle: { color: 'transparent' } } },
      { name: '增长', type: 'bar', stack: 'waterfall', data: increaseSeries,
        label: { show: true, position: 'top', fontSize: 9, color: '#10b981', formatter: function(p) { return ''; } } },
      { name: '减少', type: 'bar', stack: 'waterfall', data: decreaseSeries,
        label: { show: true, position: 'bottom', fontSize: 9, color: '#ef4444', formatter: function(p) { return ''; } } },
    ],
  };

  const hLines = { categories: cats, linePoints: linePoints };
  const hLinesJSON = JSON.stringify(hLines);
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');
  const id = chartId || 'wf_' + Math.random().toString(36).slice(2, 8);

  const startVal = rawData[0].value;
  const totalChange = endVal - startVal;
  const changeSign = totalChange >= 0 ? '↑' : '↓';
  const summaryColor = totalChange >= 0 ? '#10b981' : '#ef4444';

  const s = style || {};
  const pos = styleToHtml(s);

  return `<div style="${pos};">
    <div style="position:absolute;top:6px;right:12px;background:#2ecc71;color:#fff;font-size:10px;padding:2px 8px;z-index:5;font-weight:600;">SVG矢量</div>
    <div id="${esc(id)}" style="width:100%;height:100%;"></div>
    <div style="position:absolute;bottom:8px;left:30px;font-size:10px;color:${summaryColor};background:rgba(255,255,255,0.92);padding:3px 8px;font-weight:600;">
      ${startVal} → ${endVal}，净变化 ${changeSign}${Math.abs(totalChange)}
    </div>
  </div>
<script>
(function(){
  var dom=document.getElementById('${esc(id)}');
  if(!dom)return;
  var chart=echarts.init(dom,null,{renderer:'svg'});
  var opt=JSON.parse('${optJSON}');
  var rawData=${JSON.stringify(rawData)};
  var hl=${hLinesJSON};
  // 重新绑定 formatter（JSON 序列化丢失函数）
  opt.tooltip.formatter=function(params){
    var idx=params[0].dataIndex;
    var raw=rawData[idx];
    if(idx===0)return raw.name+'<br/>起始值: '+raw.value;
    if(idx===rawData.length-1)return raw.name+'<br/>最终值: '+raw.value;
    var sign=raw.value>=0?'+':'';
    return raw.name+'<br/>变化: '+sign+raw.value+'<br/>累计: '+hl.linePoints[idx];
  };
  opt.series[1].label.formatter=function(p){
    return p.value>0&&p.dataIndex>0&&p.dataIndex<rawData.length-1?'+'+p.value:(p.dataIndex===0||p.dataIndex===rawData.length-1?p.value:'');
  };
  opt.series[2].label.formatter=function(p){
    return p.value>0?'-'+p.value:'';
  };
  // 虚线连接线
  opt.series.push({name:'累计线',type:'custom',data:[0],z:2,
    renderItem:function(params,api){
      var children=[];
      for(var j=0;j<hl.linePoints.length-1;j++){
        var p1=api.coord([hl.categories[j],hl.linePoints[j]]);
        var p2=api.coord([hl.categories[j+1],hl.linePoints[j]]);
        children.push({type:'line',shape:{x1:p1[0],y1:p1[1],x2:p2[0],y2:p1[1]},style:{stroke:'#999',lineWidth:1.5,lineDash:[4,3]}});
      }
      return {type:'group',children:children};
    }
  });
  chart.setOption(opt);
  new ResizeObserver(function(){chart.resize();}).observe(dom);
})();
<\/script>`;
}

module.exports = { render };
