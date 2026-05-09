import Link from 'next/link';
import { SettingsHero, SettingsPanel, Field } from '../_components/settings-ui';

export default function WhatsappSettingsPage() {
  return (
    <div className="space-y-5">
      <SettingsHero
        eyebrow="Canal ativo"
        title="WhatsApp"
        description="Controle o numero conectado, regras de envio e mensagens operacionais."
      />
      <SettingsPanel
        title="Conexao"
        description="O pareamento e o status real ficam na tela oficial de WhatsApp."
        action={
          <Link href="/dashboard/whatsapp/accounts" className="rounded-[10px] bg-slate-950 px-3 py-2 text-xs font-black text-white">
            Abrir conexao
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome exibido" />
          <Field label="Numero principal" />
        </div>
      </SettingsPanel>
    </div>
  );
}
