"use client";

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

/* ── Dados ─────────────────────────────────────── */
const revenueData = [
  { mes: 'Jan', receita: 18400, despesas: 9200  },
  { mes: 'Fev', receita: 22100, despesas: 10800 },
  { mes: 'Mar', receita: 19600, despesas: 8400  },
  { mes: 'Abr', receita: 25800, despesas: 11200 },
  { mes: 'Mai', receita: 23400, despesas: 9600  },
  { mes: 'Jun', receita: 28900, despesas: 12400 },
  { mes: 'Jul', receita: 31200, despesas: 13800 },
];

const pipelineData = [
  { etapa: 'Triagem',    valor: 48 },
  { etapa: 'Entrevista', valor: 27 },
  { etapa: 'Técnica',    valor: 18 },
  { etapa: 'Proposta',   valor: 11 },
  { etapa: 'Aprovado',   valor: 6  },
];

const whatsappData = [
  { dia: 'Seg', msgs: 142 },
  { dia: 'Ter', msgs: 198 },
  { dia: 'Qua', msgs: 167 },
  { dia: 'Qui', msgs: 221 },
  { dia: 'Sex', msgs: 189 },
  { dia: 'Sáb', msgs: 94  },
  { dia: 'Dom', msgs: 76  },
];

const statusPie = [
  { name: 'Ativo',    value: 58, color: '#0D9488' },
  { name: 'Pendente', value: 24, color: '#F59E0B' },
  { name: 'Inativo',  value: 18, color: '#E5E7EB' },
];

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', color: '#fff', borderRadius: 12,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(255,255,255,0.6)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999
            ? `R$ ${p.value.toLocaleString('pt-BR')}` : p.value}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ period }: { period: string }) {
  return (
    <div style={{ width: '100%', height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0D9488" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6B7280" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#6B7280" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="receita"  name="Receita"  stroke="#0D9488" strokeWidth={2}   fill="url(#gReceita)"  dot={false} activeDot={{ r: 4, fill: '#0D9488' }} />
          <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#9CA3AF" strokeWidth={1.5} fill="url(#gDespesas)" dot={false} activeDot={{ r: 4, fill: '#9CA3AF' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart() {
  return (
    <PieChart width={160} height={160}>
      <Pie data={statusPie} cx={80} cy={80} innerRadius={50} outerRadius={75}
        paddingAngle={3} dataKey="value" strokeWidth={0}>
        {statusPie.map(entry => <Cell key={entry.name} fill={entry.color} />)}
      </Pie>
      <Tooltip content={({ active, payload }) =>
        active && payload?.length ? (
          <div style={{ background: '#111827', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
            {payload[0].name}: {payload[0].value}%
          </div>
        ) : null
      } />
    </PieChart>
  );
}

export function PipelineChart() {
  return (
    <div style={{ width: '100%', height: 175 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pipelineData} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} />
          <Bar dataKey="valor" name="Candidatos" fill="#0D0D0E" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WhatsappChart() {
  return (
    <div style={{ width: '100%', height: 175 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={whatsappData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} />
          <Line type="monotone" dataKey="msgs" name="Mensagens" stroke="#0D9488" strokeWidth={2.5}
            dot={{ fill: '#0D9488', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
