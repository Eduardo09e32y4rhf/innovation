const fs = require('fs');
let content = fs.readFileSync('apps/web/app/lib/pdf-utils.ts', 'utf8');

// Reduce page margins
content = content.replace(/const margin = landscape \? '8mm 10mm' : '10mm 10mm';/g, "const margin = landscape ? '5mm 5mm' : '5mm 5mm';");

// Reduce base font size and line height
content = content.replace(/font-size: 8.5pt;/g, 'font-size: 7.5pt;');
content = content.replace(/line-height: 1.4;/g, 'line-height: 1.15;');

// Reduce header padding/margin
content = content.replace(/padding-bottom:10px;margin-bottom:16px;/g, 'padding-bottom:4px;margin-bottom:8px;');
content = content.replace(/width:40px;height:40px;/g, 'width:30px;height:30px;');
content = content.replace(/max-width:40px;max-height:40px;/g, 'max-width:30px;max-height:30px;');
content = content.replace(/width:36px;height:36px;/g, 'width:28px;height:28px;');
content = content.replace(/font-size:13px;/g, 'font-size:10px;');
content = content.replace(/font-size:8px;/g, 'font-size:7px;');
content = content.replace(/font-size:9px;/g, 'font-size:7.5px;');
content = content.replace(/margin-top:4px;/g, 'margin-top:2px;');
content = content.replace(/margin-top:20px;/g, 'margin-top:10px;');

// Reduce footer padding
content = content.replace(/padding-top:8px;/g, 'padding-top:4px;');
content = content.replace(/font-size:7.5px;/g, 'font-size:6.5px;');

// Reduce section padding/margin
content = content.replace(/margin-bottom:12px;/g, 'margin-bottom:6px;');
content = content.replace(/padding:6px 12px;/g, 'padding:3px 6px;');
content = content.replace(/padding:10px 12px;/g, 'padding:4px 6px;');

// Reduce infoGrid spacing
content = content.replace(/padding:2px 4px;/g, 'padding:1px 2px;');
content = content.replace(/gap:8px 4px;/g, 'gap:4px 2px;');
content = content.replace(/font-size:10px;/g, 'font-size:8px;');

// Reduce pdfTable spacing
content = content.replace(/const fontSize = options\?.fontSize \?\? '8px';/g, "const fontSize = options?.fontSize ?? '7px';");
content = content.replace(/const paddingY = options\?.compact \? '3px' : '6px';/g, "const paddingY = options?.compact ? '2px' : '3px';");
content = content.replace(/padding:\$\{paddingY\} 8px;/g, 'padding:${paddingY} 4px;');

// Reduce signatureBlock spacing
content = content.replace(/margin-top:28px;/g, 'margin-top:16px;');

fs.writeFileSync('apps/web/app/lib/pdf-utils.ts', content, 'utf8');
console.log('PDF styles compacted successfully.');
