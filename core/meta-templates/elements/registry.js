/**
 * elements/index.js — 元素注册表（唯一真相源：tag → html + ppt）
 *
 * 加新元素：在此文件加一行即可。layout/elements.js 自动读取。
 */

var heading   = require('./text/heading');
var paragraph = require('./text/paragraph');
var list      = require('./text/list');
var callout   = require('./text/callout');
var image     = require('./visual/image');
var box       = require('./visual/box');
var tableEl   = require('./data/table');
var waterfall = require('./data/waterfall');
var chartShell = require('./data/chart-shell');

function buildSeries(data) {
  var series = [];
  for (var col = 1; col < (data.headers ? data.headers.length : 1); col++) {
    series.push({
      name: data.headers[col],
      labels: data.rows ? data.rows.map(function(r) { return r[0]; }) : [],
      values: data.rows ? data.rows.map(function(r) { return parseFloat(r[col]) || 0; }) : [],
    });
  }
  return series;
}

var ELEMENTS = {

  h1: {
    html: function(data, st) { return heading.render(1, data.text, st); },
    ppt: function(data, st) {
      var fs = Number(st['font-size']) || 32;
      return { action:'addText', text:data.text||'', fontSize:fs, bold:st.bold==='true'||true, color:st.color||'333333', align:st.align||'left', fontFace:'Microsoft YaHei' };
    },
  },
  h2: {
    html: function(data, st) { return heading.render(2, data.text, st); },
    ppt: function(data, st) {
      var fs = Number(st['font-size']) || 24;
      return { action:'addText', text:data.text||'', fontSize:fs, bold:st.bold==='true'||true, color:st.color||'333333', align:st.align||'left', fontFace:'Microsoft YaHei' };
    },
  },
  h3: {
    html: function(data, st) { return heading.render(3, data.text, st); },
    ppt: function(data, st) {
      var fs = Number(st['font-size']) || 18;
      return { action:'addText', text:data.text||'', fontSize:fs, bold:st.bold==='true', color:st.color||'333333', align:st.align||'left', fontFace:'Microsoft YaHei' };
    },
  },
  h4: {
    html: function(data, st) { return heading.render(4, data.text, st); },
    ppt: function(data, st) {
      var fs = Number(st['font-size']) || 15;
      return { action:'addText', text:data.text||'', fontSize:fs, color:st.color||'333333', align:st.align||'left', fontFace:'Microsoft YaHei' };
    },
  },

  p: {
    html: function(data, st) { return paragraph.render(data.text, data.inlineMarkup, st); },
    ppt: function(data, st) {
      var runs = (data.runs && data.runs.length > 0) ? data.runs : [{ text: data.text || '', options: {} }];
      return { action:'addText', runs:runs, fontSize:Number(st['font-size'])||13, color:st.color||'555555', align:st.align||'left', fontFace:'Microsoft YaHei', valign:'top' };
    },
  },

  list: {
    html: function(data, st) { return list.render(data.items, data.ordered, st); },
    ppt: function(data, st) {
      var listItems = data.items || [], lfs = Number(st['font-size']) || 12, actions = [];
      for (var i = 0; i < listItems.length; i++) {
        var item = listItems[i], prefix = data.ordered ? (i+1)+'. ' : '▸  ', itemRuns;
        if (item.runs && item.runs.length > 0) {
          itemRuns = [{ text:prefix, options:{color:'667eea',fontSize:lfs} }].concat(item.runs);
        } else {
          itemRuns = [{ text:prefix, options:{color:'667eea',fontSize:lfs} }, { text:item.text||'', options:{fontSize:lfs,color:st.color||'444444'} }];
        }
        actions.push({ action:'addText', runs:itemRuns, fontSize:lfs, fontFace:'Microsoft YaHei' });
      }
      return { action:'addListItems', items:actions };
    },
  },

  table: {
    html: function(data, st) { return tableEl.render(data.headers, data.rows, st); },
    ppt: function(data, st) {
      var nCols = data.headers ? data.headers.length : 1, tblfs = Number(st['font-size']) || 11;
      var TK = { pt:2, color:'1a1a1a', type:'solid' }, HD = { pt:1.5, color:'1a1a1a', type:'solid' }, N = null;
      var pptRows = [data.headers.map(function(h) {
        return { text:h, options:{ bold:true, fontSize:tblfs, color:'1a1a1a', align:'center', fontFace:'Microsoft YaHei', border:[TK,N,HD,N] }};
      })];
      if (data.rows) {
        data.rows.forEach(function(row, ri) {
          var isLast = ri === data.rows.length - 1;
          pptRows.push(row.map(function(c) {
            return { text:c, options:{ fill:{color:ri%2===0?'F9FAFB':'FFFFFF'}, align:'center', fontFace:'Microsoft YaHei', fontSize:tblfs-1, color:'333333', border:isLast?[N,N,TK,N]:[N,N,N,N] }};
          }));
        });
      }
      return { action:'addTable', rows:pptRows, colW:data.headers.map(function(_,ci){ return ci===0?0.35:0.65/(nCols-1); }), rowH:0.3 };
    },
  },

  img: {
    html: function(data, st) { return image.render(data.src, data.label, {}); },
    ppt: function(data) { return { action:'addImage', imgSrc:data.src||'', label:data.label||'' }; },
  },

  callout: {
    html: function(data, st) { return callout.render(1, data.text, st); },
    ppt: function(data, st) {
      return { action:'addText', text:'💡 '+(data.text||''), fontSize:Number(st['font-size'])||14, color:st.color||'333333', align:st.align||'left', fontFace:'Microsoft YaHei' };
    },
  },

  box: {
    html: function(data, st) { return box.render(st); },
    ppt: function(data, st) {
      return { action:'addShape', shapeType:'rect', fill:st['fill-color']||null, line:st['border-color']?{color:st['border-color'],width:Number(st['border-width'])||0.5}:null, rectRadius:st['border-radius']?Number(st['border-radius'])/96:0.05 };
    },
  },

  chart: {
    html: function(data, st) {
      var ct = (st.chartType || 'bar').toLowerCase();
      if (ct === 'waterfall' || ct === 'waterfall2') {
        return waterfall.render((data.rows||[]).map(function(r){return{name:r[0],value:parseFloat(r[1])||0};}), '', 'chart_reg', {});
      }
      return chartShell.render('chart_reg', { tooltip:{}, xAxis:{type:'category',data:(data.rows||[]).map(function(r){return r[0];})}, yAxis:{}, series:[{type:ct,data:(data.rows||[]).map(function(r){return parseFloat(r[1])||0;})}] }, {});
    },
    ppt: function(data, st) {
      var ct = (st.chartType || 'bar').toLowerCase();
      if (ct === 'waterfall' || ct === 'waterfall2') {
        return { action:'addWaterfall', chartType:ct, chartData:{ categories:data.rows.map(function(r){return r[0];}), series:buildSeries(data) } };
      }
      var s = buildSeries(data);
      return { action:'addChart', chartType:ct.toUpperCase(), chartData:s, showLegend:ct==='pie'||ct==='doughnut'||s.length>1 };
    },
  },

};

module.exports = ELEMENTS;
