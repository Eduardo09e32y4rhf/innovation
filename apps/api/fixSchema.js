const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

// The replacement was messed up because of literal '\\n'.
// I'll fix the literal \n strings.
schema = schema.replace(/\\n/g, '\n');

fs.writeFileSync(schemaPath, schema);
console.log("Fixed \\n");
