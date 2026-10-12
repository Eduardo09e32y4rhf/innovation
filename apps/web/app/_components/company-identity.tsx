/** Quem é a empresa por trás do site (aparece na landing, no cadastro, nos termos e na privacidade). */
export const GRUPO = {
  nome: 'Prosolution Soluções Empresariais',
  cnpj: '54.694.364/0001-48',
  endereco: 'Av. Paulista, 1106, Sala 01, 16º andar, Bela Vista, São Paulo - SP, CEP 01310-914',
} as const;

/** Linha curta para rodapés. `claro` = texto para fundo escuro. */
export function CompanyIdentity({ claro = false, className = '' }: { claro?: boolean; className?: string }) {
  return (
    <address className={`not-italic ${claro ? 'text-white/55' : 'text-zinc-500'} ${className}`}>
      <p>Innovation RH Connect é uma plataforma do grupo <strong className={claro ? 'font-semibold text-white/80' : 'font-semibold text-zinc-700'}>{GRUPO.nome}</strong>.</p>
      <p>CNPJ {GRUPO.cnpj} · {GRUPO.endereco}</p>
    </address>
  );
}
