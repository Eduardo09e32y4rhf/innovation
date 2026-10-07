import { describe, expect, it } from 'vitest';
import { FATURAS_PERMISSIONS, faturasRoleAllows, userHasFaturasPermission, type FaturasPermission } from './faturas-permissions';
import type { UserRole } from '../types/auth.types';

const TODAS = [...FATURAS_PERMISSIONS] as FaturasPermission[];
const SEM_ACESSO: UserRole[] = ['GESTOR', 'FUNCIONARIO', 'CONSULTA', 'COMERCIAL', 'RH_RS'];

describe('userHasFaturasPermission', () => {
  it('usa o padrão do perfil quando não há permissões personalizadas', () => {
    expect(userHasFaturasPermission({ role: 'ADMIN' }, 'faturas.pagar')).toBe(true);
    expect(userHasFaturasPermission({ role: 'RH', customPermissions: [] }, 'faturas.ver')).toBe(true);
    expect(userHasFaturasPermission({ role: 'GESTOR' }, 'faturas.ver')).toBe(false);
  });

  it('contador só vê e anexa NF; não cobra nem reembolsa', () => {
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.todas_empresas')).toBe(true);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.nf_anexar')).toBe(true);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.cobrar')).toBe(false);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.reembolsar')).toBe(false);
  });

  it('permissões personalizadas substituem o padrão, dentro do teto do perfil', () => {
    expect(userHasFaturasPermission({ role: 'ADMIN', customPermissions: ['faturas.ver'] }, 'faturas.ver')).toBe(true);
    expect(userHasFaturasPermission({ role: 'ADMIN', customPermissions: ['users.view_team'] }, 'faturas.ver')).toBe(false);
  });

  it('permissões definidas pelo DEV para o perfil substituem o padrão, mas não as personalizadas do usuário', () => {
    expect(userHasFaturasPermission({ role: 'ADMIN' }, 'faturas.pagar', ['faturas.ver'])).toBe(false);
    expect(userHasFaturasPermission({ role: 'ADMIN', customPermissions: ['faturas.pagar'] }, 'faturas.pagar', ['faturas.ver'])).toBe(true);
  });

  it('DEV sempre passa', () => {
    expect(userHasFaturasPermission({ role: 'DEV', customPermissions: ['x'] }, 'faturas.reembolsar', [])).toBe(true);
  });
});

describe('teto por perfil da aba Faturas', () => {
  it.each(SEM_ACESSO)('%s não tem nenhuma permissão de Faturas, nem personalizada nem configurada pelo DEV', (role) => {
    for (const permission of TODAS) {
      expect(userHasFaturasPermission({ role }, permission)).toBe(false);
      expect(userHasFaturasPermission({ role, customPermissions: TODAS }, permission)).toBe(false);
      expect(userHasFaturasPermission({ role }, permission, TODAS)).toBe(false);
      expect(faturasRoleAllows(role, permission)).toBe(false);
    }
  });

  it('Admin e RH nunca ganham visão de todas as empresas nem operações da plataforma', () => {
    for (const role of ['ADMIN', 'RH'] as UserRole[]) {
      for (const permission of ['faturas.todas_empresas', 'faturas.cobrar', 'faturas.desconto', 'faturas.reembolsar', 'faturas.nf_anexar'] as FaturasPermission[]) {
        expect(userHasFaturasPermission({ role, customPermissions: TODAS }, permission)).toBe(false);
        expect(userHasFaturasPermission({ role }, permission, TODAS)).toBe(false);
      }
    }
  });

  it('padrões: Admin vê/paga/plano; RH vê/paga; CEO e DEV tudo; Contábil visão completa + NF', () => {
    expect(['faturas.ver', 'faturas.pagar', 'faturas.plano'].every((p) => userHasFaturasPermission({ role: 'ADMIN' }, p as FaturasPermission))).toBe(true);
    expect(userHasFaturasPermission({ role: 'RH' }, 'faturas.plano')).toBe(false);
    for (const p of TODAS) { expect(userHasFaturasPermission({ role: 'CEO' }, p)).toBe(true); expect(userHasFaturasPermission({ role: 'DEV' }, p)).toBe(true); }
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.todas_empresas')).toBe(true);
  });

  it('usuário sem perfil não tem nada', () => {
    expect(userHasFaturasPermission(undefined, 'faturas.ver')).toBe(false);
    expect(userHasFaturasPermission({}, 'faturas.ver')).toBe(false);
  });
});
