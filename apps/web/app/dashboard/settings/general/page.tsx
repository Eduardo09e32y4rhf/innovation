import { Building2, Save } from 'lucide-react';
import { Field, SettingsHero, SettingsPanel } from '../_components/settings-ui';

export default function GeneralSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SettingsHero title="Configuracoes Gerais" description="Perfil, identidade e preferencias padrao da empresa." />

      <SettingsPanel title="Perfil da empresa" description="Dados usados em documentos, cobranca e comunicacoes.">
        <div className="mb-5 flex items-center gap-3">
          <div className="settings-icon">
            <Building2 size={16} />
          </div>
          <input type="file" className="h-9 flex-1 rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-inner" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome da empresa" defaultValue="Innovation IA" />
          <Field label="CNPJ" />
          <Field label="Telefone" />
          <Field label="Comercial de e-mail" />
          <Field label="Local" />
          <Field label="Endereco" />
          <Field label="Fuso horario" defaultValue="America/Sao_Paulo" />
          <Field label="Idioma" defaultValue="pt-BR" />
          <Field label="Moeda padrao" defaultValue="BRL" />
          <Field label="Tema do sistema" defaultValue="Sistema" />
        </div>
      </SettingsPanel>

      <button className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(2,6,23,0.22)]">
        <Save size={13} />
        Salvar
      </button>
    </div>
  );
}
