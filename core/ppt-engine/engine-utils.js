module.exports = `
var textLines=function(t,w,f){if(!t||!w||!f)return 1;var tw=0;for(var i=0;i<t.length;i++){var c=t.charCodeAt(i);var wide=(c>=0x4E00&&c<=0x9FFF)||(c>=0x3400&&c<=0x4DBF)||(c>=0xF900&&c<=0xFAFF)||(c>=0x3000&&c<=0x303F)||(c>=0xFF00&&c<=0xFFEF)||(c>=0x2000&&c<=0x206F)||(c>=0x2E80&&c<=0x2FFF)||(c>=0xFE30&&c<=0xFE4F);tw+=f*(wide?1.0:0.55);}var cpl=Math.floor(w*96/tw*t.length);if(cpl<1)cpl=1;return Math.ceil(t.length/cpl);};
`;
