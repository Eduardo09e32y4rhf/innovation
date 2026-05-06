// FINANCEIRO/services/InvoiceService.ts
export class InvoiceService {
  /**
   * Lista as faturas passadas do cliente.
   */
  static getInvoiceHistory(customerId: string) {
    return [
      { id: 'inv_01', date: '01/04/2026', amount: 'R$ 149,00', status: 'PAID', pdf: '#' },
      { id: 'inv_02', date: '01/03/2026', amount: 'R$ 149,00', status: 'PAID', pdf: '#' },
      { id: 'inv_03', date: '01/02/2026', amount: 'R$ 49,00', status: 'PAID', pdf: '#' },
    ];
  }

  /**
   * Simula a geração de um PDF de fatura.
   */
  static generatePDF(invoiceId: string) {
    console.log(`📄 Gerando PDF para a fatura ${invoiceId}`);
    return {
      url: `/api/finance/invoices/${invoiceId}.pdf`,
      generatedAt: new Date()
    };
  }
}
