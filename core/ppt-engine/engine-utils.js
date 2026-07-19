module.exports = `
var textLines=function(t,w,f){if(!t||!w||!f)return 1;var c=Math.floor(w*96/(f*1.0));if(c<1)c=1;return Math.ceil(String(t).length/c);};
`;
