// Build: concatenates src/ into ONE self-contained index.html (Matter.js, Oswald font and the mascot/sign art inlined).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f));
const font = rd('build/oswald.woff2').toString('base64');
const fontCss = `<style>@font-face{font-family:"Oswald";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:200 700;font-display:block}</style>\n`;
let html = rd('src/head.html').toString().replace('<!--FONT-->', fontCss);
html = html.replace('<script>\n', '<script>\n' + rd('vendor/matter.min.js').toString() + '\n</script>\n<script>\n');   // Matter.js 0.20.0 (MIT), vendored
const art = { mascot: 'assets/mascot-croww-desk_512.png', sign: 'assets/logo-croww-neon_720.png', 'neutral.mascot': 'assets/neutral/mascot.png' };
for (const k in art) art[k] = 'data:image/png;base64,' + rd(art[k]).toString('base64');
html += `const ART_SRC = ${JSON.stringify(art)};\n`;
for (const f of ['1-core.js', '1b-theme.js', '2-track.js', '3-game.js', '4-draw.js', '5-ui.js']) html += rd('src/' + f).toString();
html += rd('src/tail.html').toString();
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('built index.html (' + html.length + ' bytes)');
