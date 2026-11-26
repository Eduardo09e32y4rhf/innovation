 'use client';

import { useI18n } from '@/app/contexts/I18nContext';

/** Quem é a empresa por trás do site (aparece na landing, no cadastro, nos termos e na privacidade). */
export const GRUPO = {
  nome: 'Innovation',
  cnpj: '70.033.249/0001-89',
  endereco: 'Av. Paulista, 1106, Sala 01, 16º andar, Bela Vista, São Paulo - SP, CEP 01310-914',
} as const;

/** Linha curta para rodapés. `claro` = texto para fundo escuro. */
export function CompanyIdentity({ claro = false, className = '' }: { claro?: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <address className={`not-italic ${claro ? 'text-white/55' : 'text-zinc-500'} ${className}`}>
      <p>{t('Innovation RH Connect é uma plataforma do grupo')} <strong className={claro ? 'font-semibold text-white/80' : 'font-semibold text-zinc-700'}>{GRUPO.nome}</strong>.</p>
      <p>{t('CNPJ')} {GRUPO.cnpj} · {GRUPO.endereco}</p>
    </address>
  );
}
