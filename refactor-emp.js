const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/employees/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

if (!txt.includes('import { Table')) {
   txt = txt.replace(/import \{ PageHeader/, 'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from \"@/app/components/ui/data-table\";\nimport { PageHeader');
}

txt = txt.replace(/<table className=\"data-table min-w-\[800px\]\">/g, '<Table className=\"min-w-[800px]\">');
txt = txt.replace(/<\/table>/g, '</Table>');
txt = txt.replace(/<thead>/g, '<TableHeader>');
txt = txt.replace(/<\/thead>/g, '</TableHeader>');
txt = txt.replace(/<tbody>/g, '<TableBody>');
txt = txt.replace(/<\/tbody>/g, '</TableBody>');

txt = txt.replace(/<tr className=\"table-head\">/g, '<TableRow>');
txt = txt.replace(/<tr key=\{([^\}]+)\} className=\"table-row\">/g, '<TableRow key={}>');
txt = txt.replace(/<tr>/g, '<TableRow>');
txt = txt.replace(/<\/tr>/g, '</TableRow>');

txt = txt.replace(/<th>/g, '<TableHead>');
txt = txt.replace(/<th className=\"text-right\">/g, '<TableHead className=\"text-right\">');
txt = txt.replace(/<\/th>/g, '</TableHead>');

txt = txt.replace(/<td>/g, '<TableCell>');
txt = txt.replace(/<td className=\"text-right\">/g, '<TableCell className=\"text-right\">');
txt = txt.replace(/<td colSpan=\{([0-9]+)\} className=\"table-empty\">/g, '<TableCell colSpan={} className=\"table-empty\">');
txt = txt.replace(/<\/td>/g, '</TableCell>');

// Also fix potential encoding issues here:
txt = txt.replace(/Funcion.*?rios/g, 'Funcionários');
txt = txt.replace(/Admiss.*?o/g, 'Admissão');
txt = txt.replace(/F.*?rias/g, 'Férias');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed employees table');
