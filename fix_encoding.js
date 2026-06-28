const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps/web/app');

const replacements = {
  'Ã§': 'ç',
  'Ã£': 'ã',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãµ': 'õ',
  'Ãº': 'ú',
  'Ã¢': 'â',
  'Ãª': 'ê',
  'Ã´': 'ô',
  'Ã‡': 'Ç',
  'Ãƒ': 'Ã',
  'Ã‰': 'É',
  'Ã“': 'Ó',
  'Ãš': 'Ú',
  'Ã‚': 'Â',
  'ÃŠ': 'Ê',
  'Ã”': 'Ô',
  'Ã ': 'À',
  'Ã€': 'À',
  'Ã\x81': 'Á', // A acute
  'Ã\xAD': 'í', // i acute
  'Ã\x8D': 'Í', // I acute
  'Ã\x95': 'Õ', // O tilde
  'Ã•': 'Õ',
  'AÇÃ•ES': 'AÇÕES',
  'INÃ CIO': 'INÍCIO',
  'AÇÃƒO': 'AÇÃO'
};

// Also handle the weird space/hidden character issue often seen with 'í' and 'Á'
// In the grep output we saw `PerÃ­odos`, which is `PerÃ\xADodos`

function fixEncoding(content) {
  let newContent = content;
  // Standard replacements
  for (const [bad, good] of Object.entries(replacements)) {
    // Escape string for regex if needed, but simple split/join is safer for weird chars
    newContent = newContent.split(bad).join(good);
  }
  
  // Specific words that might have gotten missed due to unprintable chars
  newContent = newContent.replace(/PerÃ.odos/g, 'Períodos');
  newContent = newContent.replace(/saÃ.da/gi, 'saída');
  newContent = newContent.replace(/SaÃ.da/g, 'Saída');
  newContent = newContent.replace(/AÃ.Ãµes/g, 'Ações');
  
  return newContent;
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const originalContent = fs.readFileSync(fullPath, 'utf8');
      const fixedContent = fixEncoding(originalContent);
      
      if (originalContent !== fixedContent) {
        fs.writeFileSync(fullPath, fixedContent, 'utf8');
        console.log(`Fixed encoding in: ${fullPath}`);
      }
    }
  }
}

console.log('Starting encoding fix sweep...');
processDirectory(directoryPath);
console.log('Sweep completed.');
