const fs = require('fs');

function fixEncodings(filePath) {
    if (fs.existsSync(filePath)) {
        let txt = fs.readFileSync(filePath, 'utf8');
        txt = txt.replace(/admissǜo/g, 'admissão');
        txt = txt.replace(/Perodo/g, 'Período');
        txt = txt.replace(/comea/g, 'começa');
        txt = txt.replace(/concessǜo/g, 'concessão');
        txt = txt.replace(/mǭximo/g, 'máximo');
        txt = txt.replace(/Funcionǭrios/g, 'Funcionários');
        txt = txt.replace(/Funcionǭrio/g, 'Funcionário');
        txt = txt.replace(/decisǜo/g, 'decisão');
        txt = txt.replace(/PendǦncias/g, 'Pendências');
        txt = txt.replace(/Aprovaǜo/g, 'Aprovação');
        txt = txt.replace(/Rejeiǜo/g, 'Rejeição');
        txt = txt.replace(/fraǜo/g, 'fração');
        txt = txt.replace(/funcionǭrio/g, 'funcionário');
        txt = txt.replace(/FǸrias/g, 'Férias');
        txt = txt.replace(/Opes/g, 'Opções');
        txt = txt.replace(/Admissǜo/g, 'Admissão');
        txt = txt.replace(/Horǭrios/g, 'Horários');
        txt = txt.replace(/Relatrio/g, 'Relatório');
        txt = txt.replace(/Exportaǜo/g, 'Exportação');
        txt = txt.replace(/Aǜo/g, 'Ação');
        txt = txt.replace(/Descriǜo/g, 'Descrição');
        txt = txt.replace(/Histrico/g, 'Histórico');
        txt = txt.replace(/Alocaǜo/g, 'Alocação');
        txt = txt.replace(/Atribuiǜo/g, 'Atribuição');
        txt = txt.replace(/Nǜo/g, 'Não');
        txt = txt.replace(/nǜo/g, 'não');
        txt = txt.replace(/Cobrana/g, 'Cobrança');
        txt = txt.replace(/cobrana/g, 'cobrança');
        txt = txt.replace(/Usuǭrios/g, 'Usuários');
        txt = txt.replace(/Gestǜo/g, 'Gestão');
        txt = txt.replace(/mdulos/g, 'módulos');
        txt = txt.replace(/Integraǜo/g, 'Integração');
        txt = txt.replace(/sǜo/g, 'são');
        txt = txt.replace(/Imutǭvel/g, 'Imutável');
        txt = txt.replace(/consistǦncia/g, 'consistência');
        txt = txt.replace(/Operaes/g, 'Operações');
        txt = txt.replace(/operaes/g, 'operações');
        txt = txt.replace(/Atenǜo/g, 'Atenção');
        txt = txt.replace(/Criaǜo/g, 'Criação');
        txt = txt.replace(/Avaliaǜo/g, 'Avaliação');
        txt = txt.replace(/descriǜo/g, 'descrição');
        txt = txt.replace(/ttulo/g, 'título');
        txt = txt.replace(/Acessos de Funcionǭrios/g, 'Acessos de Funcionários');
        
        fs.writeFileSync(filePath, txt, 'utf8');
    }
}

fixEncodings('apps/web/app/[tenant]/dashboard/vacations/page.tsx');
fixEncodings('apps/web/app/[tenant]/dashboard/employees/page.tsx');
fixEncodings('apps/web/app/[tenant]/dashboard/escalas/ponto/page.tsx');
fixEncodings('apps/web/app/[tenant]/dashboard/management/agenda/page.tsx');
fixEncodings('apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx');

console.log('Fixed encodings correctly');
