const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/escalas/ponto/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

if (!txt.includes('import { Table')) {
   txt = txt.replace(/import \{ PageHeader/, 'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from \"@/app/components/ui/data-table\";\nimport { PageHeader');
}

txt = txt.replace(/<table className=\"w-full min-w-\[900px\] border-collapse text-left\">/g, '<Table className=\"min-w-[900px]\">');
txt = txt.replace(/<\/table>/g, '</Table>');
txt = txt.replace(/<thead>/g, '<TableHeader>');
txt = txt.replace(/<\/thead>/g, '</TableHeader>');
txt = txt.replace(/<tbody className=\"divide-y divide-slate-100\">/g, '<TableBody>');
txt = txt.replace(/<\/tbody>/g, '</TableBody>');

txt = txt.replace(/<tr className=\"bg-gradient-to-r from-slate-100 to-slate-50 text-\[10px\] font-black uppercase tracking-\[0.14em\] text-slate-600\">/g, '<TableRow>');
txt = txt.replace(/<tr className=\"bg-white text-\[10px\] font-black uppercase tracking-\[0.14em\] text-slate-600 border-b border-slate-100\">/g, '<TableRow>');

txt = txt.replace(/<th className=\"px-6 py-4\">/g, '<TableHead>');
txt = txt.replace(/<th className=\"px-6 py-4 text-right\">/g, '<TableHead className=\"text-right\">');
txt = txt.replace(/<\/th>/g, '</TableHead>');

txt = txt.replace(/<td className=\"px-6 py-4\">/g, '<TableCell>');
txt = txt.replace(/<td className=\"px-6 py-4 text-xs font-semibold text-slate-600\">/g, '<TableCell>');
txt = txt.replace(/<td className=\"px-6 py-4 text-right\">/g, '<TableCell className=\"text-right\">');
txt = txt.replace(/<td colSpan=\{[0-9]+\} className=\"p-8 text-center text-sm font-semibold text-slate-500\">/g, '<TableCell colSpan={7} className=\"text-center text-slate-500 p-8\">');
txt = txt.replace(/<\/td>/g, '</TableCell>');

txt = txt.replace(/<tr key=\{([^\}]+)\} className=\"group transition-all duration-200 hover:bg-slate-50\/40\">/g, '<TableRow key={}>');
txt = txt.replace(/<tr key=\{([^\}]+)\} className=\{\group transition-all duration-200 hover:bg-slate-50\/40(.*?)\\}>/g, '<TableRow key={} className={$2}>');
txt = txt.replace(/<tr>/g, '<TableRow>');
txt = txt.replace(/<\/tr>/g, '</TableRow>');

// Fix any encodings
txt = txt.replace(/Hor.*?rios/g, 'Horários');
txt = txt.replace(/Funcion.*?rio/g, 'Funcionário');
txt = txt.replace(/Aprova.*?o/g, 'Aprovação');
txt = txt.replace(/Relat.*?rio/g, 'Relatório');
txt = txt.replace(/Exporta.*?o/g, 'Exportação');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed ponto tables');
