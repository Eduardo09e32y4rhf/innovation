const fs = require('fs');
let file = fs.readFileSync('apps/web/app/dashboard/time-track/page.tsx', 'utf8');

const replacements = {
  'suspensǟo': 'suspensão',
  'SUSPENSǟO': 'SUSPENSÃO',
  'Lanǟamento manual': 'Lançamento manual',
  'LANǟAR': 'LANÇAR',
  'saǟda': 'saída',
  'Saǟda': 'Saída',
  'Ocorrǟncias': 'Ocorrências',
  'OCORRǟNCIAS': 'OCORRÊNCIAS',
  'FALTA NǟO JUSTIFICADA': 'FALTA NÃO JUSTIFICADA',
  'Assinatura Diǟria': 'Assinatura Diária',
  'Matrǟcula': 'Matrícula',
  'Perǟodo': 'Período',
  'Admissǟo': 'Admissão',
  'APǟ"S DEMISSǟO': 'APÓS DEMISSÃO',
  'ANTES DA ADMISSǟO': 'ANTES DA ADMISSÃO',
  'Almoǟo': 'Almoço',
  'ALMOǟO': 'ALMOÇO',
  'MARCAǟǟO': 'MARCAÇÃO',
  'APROVAǟǟO': 'APROVAÇÃO',
  'Ocorrǟncia': 'Ocorrência',
  'FALTA DE MARCAǟǟO': 'FALTA DE MARCAÇÃO'
};

for (const [bad, good] of Object.entries(replacements)) {
  file = file.split(bad).join(good);
}

fs.writeFileSync('apps/web/app/dashboard/time-track/page.tsx', file, 'utf8');
console.log('Done replacing strings.');
