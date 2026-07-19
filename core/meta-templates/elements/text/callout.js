const { esc } = require('../shared/escape');

function render(level, text, style) {
  var s = style || {};
  var fs = s['font-size'] || 14;

  var bg   = s['fill-color'] ? '#' + s['fill-color'] : '#FFF3CD';
  var bd   = s['border-color'] ? '2px solid #' + s['border-color'] : '2px solid #FFC107';
  var icon = s.icon || '💡';

  return '<div style="margin:0;padding:12px 16px;font-size:' + fs + 'px;background:' + bg + ';border-left:' + bd + ';border-radius:4px;color:#333;line-height:1.6;">'
    + icon + ' ' + esc(text) + '</div>';
}

module.exports = { render };
