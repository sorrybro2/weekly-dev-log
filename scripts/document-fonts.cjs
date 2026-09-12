const fs = require('node:fs');
const path = require('node:path');

// Keep exported HTML independent of installed fonts and remote font services.
const directory = path.join(__dirname, '../assets/fonts');
const font = fs.readFileSync(path.join(directory, 'PretendardVariable.woff2')).toString('base64');
const license = fs.readFileSync(path.join(directory, 'OFL.txt'), 'utf8').replaceAll('*/', '* /');
const fontCss = '/* Pretendard v1.3.9 — ' + license + ' */\n' +
  '@font-face{font-family:Pretendard;font-style:normal;font-weight:45 920;font-display:block;src:url(data:font/woff2;base64,' + font + ') format("woff2");}\n';

module.exports = { fontCss };
