'use client';

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Alinha à direita no computador (valores e ações). */
  right?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  caption?: string;
}

/** Tabela no computador; abaixo de 768 px cada linha vira um cartão com rótulo e valor (classe `table-stack`). */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, caption }: DataTableProps<T>) {
  return (
    <div className="card-v2 overflow-hidden">
      <table className="table-stack w-full text-left text-sm md:min-w-[640px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-bg-sub text-xs uppercase text-fg-mut">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`p-3 font-semibold ${column.right ? 'text-right' : ''}`}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => { if (event.key === 'Enter') onRowClick(row); } : undefined}
              className={`border-t border-border ${onRowClick ? 'cursor-pointer hover:bg-bg-sub focus:bg-bg-sub focus:outline-none' : ''}`}>
              {columns.map((column) => <td key={column.key} data-label={column.label} className={`p-3 text-fg ${column.right ? 'md:text-right' : ''} ${column.className ?? ''}`}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paginação simples usada pelas listas (a página fica na URL). */
export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total?: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-sub">
      <span>{total !== undefined ? `${total} registro(s) · ` : ''}página {page} de {pages}</span>
      <span className="flex gap-2">
        <button type="button" className="btn btn-outline min-h-11" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <button type="button" className="btn btn-outline min-h-11" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima</button>
      </span>
    </nav>
  );
}
