'use client';

import Link from 'next/link';
import { Edit3, UserMinus, UserPlus } from 'lucide-react';

const employees = [
  { name: 'Ana Lima', cpf: '123.456.789-00', department: 'RH', position: 'Analista de RH', status: 'ACTIVE' },
  { name: 'Bruno Rocha', cpf: '234.567.890-11', department: 'Operacoes', position: 'Supervisor', status: 'ACTIVE' },
  { name: 'Carla Mendes', cpf: '345.678.901-22', department: 'Atendimento', position: 'Assistente', status: 'ACTIVE' },
];

export default function EmployeesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionarios</p>
          <h2 className="text-2xl font-black text-slate-950">Cadastro da equipe</h2>
        </div>
        <Link href="/dashboard/employees/new" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <UserPlus size={14} />
          Novo
        </Link>
      </header>

      <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[11px] font-medium text-slate-500">
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4">CPF</th>
                <th className="pb-3 pr-4">Departamento</th>
                <th className="pb-3 pr-4">Cargo</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.cpf} className="border-t border-slate-100 text-xs text-slate-700">
                  <td className="py-3 pr-4 font-medium text-slate-950">{employee.name}</td>
                  <td className="py-3 pr-4">{employee.cpf}</td>
                  <td className="py-3 pr-4">{employee.department}</td>
                  <td className="py-3 pr-4">{employee.position}</td>
                  <td className="py-3 pr-4">{employee.status}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />Editar</button>
                      <button className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><UserMinus size={12} />Desligar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
