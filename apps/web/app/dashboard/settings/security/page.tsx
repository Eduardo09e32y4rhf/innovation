import { SettingsHero, SettingsPanel, Field } from '../_components/settings-ui';

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-5">
      <SettingsHero
        eyebrow="Acesso"
        title="Seguranca"
        description="Regras de sessao, auditoria e protecao para uso em producao."
      />
      <SettingsPanel title="Sessao" description="Defina politicas de acesso para operadores e administradores.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tempo maximo de sessao em minutos" defaultValue="480" />
          <Field label="Dominio permitido" />
        </div>
      </SettingsPanel>
    </div>
  );
}
