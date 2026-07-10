const PDFDocument = require('pdfkit');
try {
  const doc = new PDFDocument();
  console.log('PDFDocument works!');
} catch (e) {
  console.error('Error:', e);
}
