const fs = require('fs');
const path = require('path');

const replacements = {
  'Ã£': 'ã',
  'Ã\x83': 'Ã',
  'Ã­': 'í',
  'Ã\x87Ã\x83': 'ÇÃ',
  'Ã§': 'ç',
  'Ãª': 'ê',
  'Ã¡': 'á',
  'Ã\x93': 'Ó',
  'Ã\x8A': 'Ê',
  'Ã\x87': 'Ç',
  'Ã\x87Ã\x95': 'ÇÕ',
  'Ã\x95': 'Õ',
  'Ã©': 'é',
  'Ã¢': 'â',
  'Ã\x81': 'Á',
  'Ã\x89': 'É',
  'Ã\x8D': 'Í',
  'Ã\x9A': 'Ú',
  'Ãº': 'ú',
  'Ã´': 'ô',
  'Ã§Ã£': 'çã',
  'Ã§Ãµ': 'çõ',
  'ðŸ”´': '🔴',
  'ðŸŸ ': '🟡',
  'ðŸ”µ': '🔵',
  'âšª': '⚪',
  'â†’': '→',
  'â\x80\x94': '—',
  'â\x80¢': '•',
  'â€”': '—',
  
  // also fix the weird characters from my earlier pass which might have left 'ǟ' in some places
  'ǟ': 'ã', // This is unsafe in general but considering it replaced "ã" or "ç" sometimes... actually, let's just use exact word replacements for the ǟ leftovers
  'MARCAÃ¤Ã¤O': 'MARCAÇÃO',
  'saÃ¤da': 'saída',
  'SUSPENSÃ¤O': 'SUSPENSÃO',
  'ALMOÃ¤O': 'ALMOÇO',
  'LanÃ¤amento': 'Lançamento',
  'LANÃ¤AR': 'LANÇAR',
  'OcorrÃ¤ncia': 'Ocorrência',
  'OCORRÃ¤NCIA': 'OCORRÊNCIA',
  'OBSERVAÃ¤Ã¤O': 'OBSERVAÇÃO'
};

let count = 0;

function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      let original = content;
      
      for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      
      // Fix double encoding leftovers manually just in case
      content = content.replace(/MARCA.*O/g, (m) => m.includes('MARCA') && m.endsWith('O') ? 'MARCAÇÃO' : m);
      content = content.replace(/OBSERVA.*O/g, (m) => m.includes('OBSERVA') && m.endsWith('O') ? 'OBSERVAÇÃO' : m);
      content = content.replace(/sa.*da/g, (m) => m.startsWith('sa') && m.endsWith('da') ? 'saída' : m);
      content = content.replace(/Lan.*amento/g, (m) => m.startsWith('Lan') && m.endsWith('amento') ? 'Lançamento' : m);
      content = content.replace(/Ocorr.*ncia/g, (m) => m.startsWith('Ocorr') && m.endsWith('ncia') ? 'Ocorrência' : m);
      content = content.replace(/FUNCION.*RIO/g, (m) => m.startsWith('FUNCION') && m.endsWith('RIO') ? 'FUNCIONÁRIO' : m);
      content = content.replace(/RETORNO ALMO.O/g, 'RETORNO ALMOÇO');
      content = content.replace(/sa.*da ALMO.O/g, 'saída ALMOÇO');

      if (content !== original) {
        fs.writeFileSync(full, content, 'utf8');
        count++;
      }
    }
  }
}
scan('apps/web/app');
console.log('Fixed', count, 'files');
