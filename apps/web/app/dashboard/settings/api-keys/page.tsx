import { SettingsHero, SettingsPanel, Field } from '../_components/settings-ui';

export default function ApiKeysSettingsPage() {
  return (
    <div className="space-y-5">
      <SettingsHero
        eyebrow="Credenciais"
        title="API Keys"
        description="Chaves usadas pelas integracoes de IA, automacoes e canais externos."
      />
      <SettingsPanel title="Provedores de IA" description="Configure chaves reais antes de ativar automacoes em producao.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="OpenAI API Key" />
          <Field label="Gemini API Key" />
        </div>
      </SettingsPanel>
    </div>
  );
}
