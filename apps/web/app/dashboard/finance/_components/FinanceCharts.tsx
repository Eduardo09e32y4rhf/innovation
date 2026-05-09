"use client";

// Este arquivo importa recharts diretamente — é carregado só no cliente
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CashFlowPoint, CategoryPoint } from '../api';

const fluxo = [
  { mes: 'Jan', entrada: 18400, saida: 9200  },
  { mes: 'Fev', entrada: 22100, saida: 10800 },
  { mes: 'Mar', entrada: 19600, saida: 8400  },
  { mes: 'Abr', entrada: 25800, saida: 11200 },
  { mes: 'Mai', entrada: 23400, saida: 9600  },
  { mes: 'Jun', entrada: 28900, saida: 12400 },
  { mes: 'Jul', entrada: 31200, saida: 13800 },
];

const categorias = [
  { cat: 'SaaS',        val: 18400 },
  { cat: 'Serviços',    val: 7200  },
  { cat: 'Consultoria', val: 5600  },
  { cat: 'Outros',      val: 2100  },
];

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', color: '#fff', borderRadius: 12,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)', minWidth: 160,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.name}</span>
          </div>
          <span style={{ fontWeight: 600 }}>R$ {Number(p.value).toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}

export function FluxoDeCaixaChart({ data = fluxo }: { data?: CashFlowPoint[] }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="gEntrada" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gSaida" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<ChartTip />} />
          <Area
            type="monotone"
            dataKey="entrada"
            name="Entrada"
            stroke="#0D9488"
            strokeWidth={2.5}
            fill="url(#gEntrada)"
            dot={false}
            activeDot={{ r: 5, fill: '#0D9488', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="saida"
            name="Saída"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gSaida)"
            dot={false}
            activeDot={{ r: 5, fill: '#EF4444', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReceitaCategoriaChart({ data = categorias }: { data?: CategoryPoint[] }) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="cat"
            tick={{ fontSize: 12, fill: '#4B5563', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<ChartTip />} />
          <Bar dataKey="val" name="Receita" fill="#0D0D0E" radius={[0, 6, 6, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
