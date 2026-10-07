import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FaturasEmpresaService } from './faturas-empresa.service';

/** Admin/RH só enxergam fatura da própria empresa; fatura alheia é 404 (não revela que existe). */
describe('FaturasEmpresaService: isolamento entre empresas (IDOR)', () => {
  const findFirst = vi.fn(async ({ where }: { where: { id: string; companyId: string } }) => (where.companyId === 'empresa-a' && where.id === 'fatura-a' ? { id: 'fatura-a' } : null));
  const prisma = { platformInvoice: { findFirst } };
  const service = new FaturasEmpresaService(prisma as never, {} as never, {} as never);

  it('consulta sempre filtrando pela empresa do token', async () => {
    await expect(service.detalhes('empresa-b', 'fatura-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'fatura-a', companyId: 'empresa-b', deletedAt: null } });
  });

  it('pedido de reembolso de fatura de outra empresa é 404 e nada é gravado', async () => {
    const actor = { sub: 'u1', email: 'x@y.com', name: 'X' } as never;
    await expect(service.pedirReembolso('empresa-b', 'fatura-a', 'motivo qualquer', actor)).rejects.toBeInstanceOf(NotFoundException);
  });
});
