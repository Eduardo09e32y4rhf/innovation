'use client';

import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { errorText, monthKey, monthLabel, shiftMonth } from './format';
import { platformHub } from './hub-api';
import { office } from './office-api';
import { OfficePanel } from './office-view';
import { DocsView, FeesView, TasksView } from './office-lists';
import { RulesPanel } from './rules-panel';
import { Competencia } from './accounting/competencia';

export type Section = 'painel' | 'competencia' | 'tarefas' | 'documentos' | 'honorarios' | 'regras';
export const SECTIONS: Array<[Section, string]> = [['painel', 'Painel do escritório'], ['competencia', 'Folha e ponto'], ['tarefas', 'Tarefas'], ['documentos', 'Documentos'], ['honorarios', 'Honorários'], ['regras', 'Regras e simulador']];

export function AccountingView({ companyId, canEdit, onOpenCompany }: { companyId?: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const [section, setSection] = useState<Section>('painel');
  const [month, setMonth] = useState(monthKey());
  const [pdfBusy, setPdfBusy] = useState(false);
  const dashboard = useQuery(() => office.dashboard(month), [month]);
  const team = useQuery(() => office.team(), []);
  const members = team.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex flex-wrap gap-1.5">
          {SECTIONS.map(([id, label]) => <button key={id} role="tab" aria-selected={section === id} type="button" onClick={() => setSection(id)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${section === id ? 'bg-slate-900 text-white shadow' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>)}
        </div>
        {section !== 'regras' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border px-1">
              <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
              <span className="min-w-[140px] text-center text-sm font-bold capitalize">{monthLabel(month)}</span>
              <Button variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
            </div>
            {section === 'competencia' && <Button variant="outline" isLoading={pdfBusy} onClick={async () => { setPdfBusy(true); try { await platformHub.accountingPdf(month, companyId); } catch (cause) { toast.error(errorText(cause, 'Não foi possível gerar o PDF.')); } finally { setPdfBusy(false); } }}><FileDown size={15} aria-hidden="true" /> Relatório PDF</Button>}
          </div>
        )}
      </div>
      {section === 'competencia' && <Competencia companyId={companyId} month={month} canEdit={canEdit} onOpenCompany={onOpenCompany} />}
      {section === 'regras' && <RulesPanel canEdit={canEdit} />}
      {!['competencia', 'regras'].includes(section) && (dashboard.error ? <ErrorState message={dashboard.error} onRetry={dashboard.refetch} /> : !dashboard.data ? <LoadingState label="Carregando o escritório…" /> : (
        <>
          {section === 'painel' && <OfficePanel data={dashboard.data} month={month} team={members} refetch={dashboard.refetch} />}
          {section === 'tarefas' && <TasksView clients={dashboard.data.clients} team={members} refreshPanel={dashboard.refetch} />}
          {section === 'documentos' && <DocsView clients={dashboard.data.clients} month={month} refreshPanel={dashboard.refetch} />}
          {section === 'honorarios' && <FeesView clients={dashboard.data.clients} month={month} refreshPanel={dashboard.refetch} />}
        </>
      ))}
    </div>
  );
}
