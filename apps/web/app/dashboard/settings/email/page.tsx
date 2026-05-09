import { SettingsHero, SettingsPanel, Field } from '../_components/settings-ui';

export default function EmailSettingsPage() {
  return (
    <div className="space-y-5">
      <SettingsHero
        eyebrow="Mensageria"
        title="E-mail"
        description="Configuracao do remetente usado em notificacoes, propostas e comunicados."
      />
      <SettingsPanel title="SMTP" description="Preencha o provedor real para habilitar envios transacionais.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Host SMTP" />
          <Field label="Porta" />
          <Field label="Usuario" />
          <Field label="Remetente padrao" />
        </div>
      </SettingsPanel>
    </div>
  );
}
