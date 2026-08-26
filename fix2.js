const fs = require('fs');
let content = fs.readFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', 'utf8');

// There are duplicates. Let's just find the first "const performFullSync ="
// and the LAST "const checkPreRomaneiosCloud = async () => {"
// wait, no, checkPreRomaneiosCloud isn't duplicated, but maybe performFullSync is duplicated AFTER it?
// Let's just regex all performFullSync definitions and delete them.
console.log(content.match(/const performFullSync = async/g).length);
