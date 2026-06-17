const fs = require('fs');
const path = require('path');

const desktopMain = path.join(__dirname, 'apps', 'desktop', 'dist', 'main.js');

module.exports = fs.existsSync(desktopMain)
  ? require(desktopMain)
  : require('./electron/main');
