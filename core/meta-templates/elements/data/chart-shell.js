const { esc } = require('../shared/escape');

function render(chartId, option, style) {
  const optJSON = JSON.stringify(option).replace(/<\//g, '<\\/');
  return `<div id="${esc(chartId)}" style="width:100%;height:100%;"></div>
<script>
(function(){
  var dom=document.getElementById('${esc(chartId)}');
  if(!dom)return;
  var chart=echarts.init(dom,null,{renderer:'svg'});
  chart.setOption(${optJSON});
  new ResizeObserver(function(){chart.resize();}).observe(dom);
})();
<\/script>`;
}

module.exports = { render };
