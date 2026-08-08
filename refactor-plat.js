const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/N.*?o/g, 'Não');
txt = txt.replace(/Cobran.*?a/g, 'Cobrança');
txt = txt.replace(/cobran.*?a/g, 'cobrança');
txt = txt.replace(/Usu.*?rios/g, 'Usuários');
txt = txt.replace(/Gest.*?o/g, 'Gestão');
txt = txt.replace(/m.*?dulos/g, 'módulos');
txt = txt.replace(/Integra.*?o/g, 'Integração');
txt = txt.replace(/s.*?o/g, 'são');
txt = txt.replace(/Imut.*?vel/g, 'Imutável');
txt = txt.replace(/consist.*?ncia/g, 'consistência');
txt = txt.replace(/Opera.*?es/g, 'Operações');
txt = txt.replace(/opera.*?es/g, 'operações');
txt = txt.replace(/Aten.*?o/g, 'Atenção');

if (!txt.includes('Drawer')) {
   txt = txt.replace(/import \{ Loader2/, 'import { Drawer } from "@/app/components/ui/drawer";\nimport { Loader2');
}

const customModalRegex = /\{isInvoiceModalOpen && \(\s*<div className="fixed inset-0[^>]*>\s*<div className="w-full max-w-md[^>]*>\s*<header[^>]*>\s*<h2[^>]*>Nova Cobrança Avulsa<\/h2>\s*<button[^>]*><X size=\{18\} \/><\/button>\s*<\/header>\s*<form onSubmit=\{createManualInvoice\} className="p-6">\s*<div className="space-y-4">\s*([\s\S]*?)\s*<\/div>\s*<footer className="mt-8 flex gap-3">\s*([\s\S]*?)\s*<\/footer>\s*<\/form>\s*<\/div>\s*<\/div>\s*\)/g;

txt = txt.replace(customModalRegex, function(match, body, footer) {
  return '<Drawer \n' +
         '  isOpen={isInvoiceModalOpen} \n' +
         '  onClose={() => setIsInvoiceModalOpen(false)} \n' +
         '  title="Nova Cobrança Avulsa"\n' +
         '  footer={\n' +
         '    <div className="flex gap-3 w-full">\n' +
         '      ' + footer + '\n' +
         '    </div>\n' +
         '  }\n' +
         '>\n' +
         '  <form id="manual-invoice-form" onSubmit={createManualInvoice} className="space-y-4">\n' +
         '    ' + body + '\n' +
         '  </form>\n' +
         '</Drawer>';
});

txt = txt.replace(/<button type="submit"([^>]*)>/g, '<button type="submit" form="manual-invoice-form">');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed platform page');
