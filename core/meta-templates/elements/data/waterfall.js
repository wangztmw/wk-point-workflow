const { esc } = require('../shared/escape');

function render(rows, title, chartId, style) {
  if (!rows || rows.length < 3) {
    return `<div style="padding:40px;color:#999;text-align:center;">瀑布图数据不足</div>`;
  }

  const rawData = rows.map(r => ({ name: r.name, value: Number(r.value) || 0 }));
  const cats = [];
  const baseSeries = [], increaseSeries = [], decreaseSeries = [], linePoints = [];
  let runningTotal = 0;

  rawData.forEach((d, i) => {
    cats.push(d.name);
    if (i === 0) {
      baseSeries.push(0);
      increaseSeries.push({ value: Math.abs(d.value), itemStyle: { color: '#2563EB', borderRadius: [4, 4, 0, 0] } });
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

  let cumMax = rawData[0].value, cumVal = rawData[0].value;
  for (let i = 1; i < rawData.length - 1; i++) { cumVal += rawData[i].value; if (cumVal > cumMax) cumMax = cumVal; }
  const yMax = Math.ceil(Math.max(cumMax, rawData[rawData.length - 1].value) * 1.08);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 8, textStyle: { fontSize: 10 }, data: ['增长', '减少'], selectedMode: false },
    grid: { left: '8%', right: '4%', top: '6%', bottom: '14%' },
    xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 10, color: '#666' }, axisLine: { lineStyle: { color: '#ddd' } } },
    yAxis: { type: 'value', max: yMax, axisLabel: { fontSize: 10, color: '#888' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: '底座', type: 'bar', stack: 'waterfall', data: baseSeries, itemStyle: { color: 'transparent' } },
      { name: '增长', type: 'bar', stack: 'waterfall', data: increaseSeries },
      { name: '减少', type: 'bar', stack: 'waterfall', data: decreaseSeries },
    ],
  };

  const hLines = { categories: cats, linePoints };
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');
  const id = chartId || 'wf_' + Math.random().toString(36).slice(2, 8);
  const s = style || {};
  const chartW = s.w || 530, chartH = s.h || 430;

  return `<div id="${esc(id)}" style="width:${chartW}px;height:${chartH}px;"></div>
<script>
(function(){
  var dom=document.getElementById('${esc(id)}');
  if(!dom)return;
  var chart=echarts.init(dom,null,{renderer:'svg'});
  var opt=${optJSON};
  var rawData=${JSON.stringify(rawData)};
  var hl=${JSON.stringify(hLines)};
  opt.tooltip.formatter=function(params){
    var idx=params[0].dataIndex, raw=rawData[idx];
    if(idx===0)return raw.name+'<br/>起始值: '+raw.value;
    if(idx===rawData.length-1)return raw.name+'<br/>最终值: '+raw.value;
    var sign=raw.value>=0?'+':'';
    return raw.name+'<br/>变化: '+sign+raw.value+'<br/>累计: '+hl.linePoints[idx];
  };
  opt.series[1].label={show:true,position:'top',fontSize:9,color:'#10b981',formatter:function(p){return p.value>0&&p.dataIndex>0&&p.dataIndex<rawData.length-1?'+'+p.value:(p.dataIndex===0||p.dataIndex===rawData.length-1?p.value:'');}};
  opt.series[2].label={show:true,position:'bottom',fontSize:9,color:'#ef4444',formatter:function(p){return p.value>0?'-'+p.value:'';}};
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
