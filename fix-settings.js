const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/settings/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace('Segurana & Acesso', 'Segurança & Acesso');
txt = txt.replace('Acessos de Funcionǭrios', 'Acessos de Funcionários');
txt = txt.replace('Configuraes da Empresa', 'Configurações da Empresa');
txt = txt.replace('Importaǜo e Exportaǜo', 'Importação e Exportação');
txt = txt.replace('Gerencie apenas as opes permitidas para o seu perfil.', 'Gerencie apenas as opções permitidas para o seu perfil.');
txt = txt.replace('Segurana da conta', 'Segurança da conta');
txt = txt.replace('Poltica de senha forte e proteǜo de acesso', 'Política de senha forte e proteção de acesso');
txt = txt.replace('Forar redefiniǜo de senha', 'Forçar redefinição de senha');
txt = txt.replace('Gerenciamento de assinaturas e histrico', 'Gerenciamento de assinaturas e histórico');
txt = txt.replace('Informaes', 'Informações');
txt = txt.replace('Endereo', 'Endereço');
txt = txt.replace('operaes', 'operações');
txt = txt.replace('Alterar Inscriǜo', 'Alterar Inscrição');

// Safe password strings replacements
txt = txt.replace('Mnimo de', 'Mínimo de');
txt = txt.replace('maiǧscula', 'maiúscula');
txt = txt.replace('minǧscula', 'minúscula');
txt = txt.replace('nǧmero', 'número');
txt = txt.replace('MǸdia', 'Média');
txt = txt.replace('Fora:', 'Força:');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed settings safely');
