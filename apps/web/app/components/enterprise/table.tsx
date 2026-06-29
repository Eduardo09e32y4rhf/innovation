'use client';

import React from 'react';
import { Download } from 'lucide-react';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  widthClassName?: string;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  rowKey,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string | number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            {columns.map((c) => (
              <th key={c.id} className={`pb-4 ${c.widthClassName ?? ''}`.trim()}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((row, idx) => {
            const key = rowKey ? rowKey(row, idx) : (row.id ?? idx);
            return (
              <tr key={String(key)} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                {columns.map((c) => (
                  <td key={c.id} className={`py-4 ${c.widthClassName ?? ''}`.trim()}>{c.cell(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TableActionButton({
  onClick,
  children,
  'aria-label': ariaLabel,
  title
}: {
  onClick?: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-white/5 rounded-lg hover:text-purple-400 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
      type="button"
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

export function DownloadPdfButton({
  onClick,
  'aria-label': ariaLabel = 'Download PDF',
  title = 'Download PDF',
}: {
  onClick?: () => void;
  'aria-label'?: string;
  title?: string;
}) {
  return (
    <TableActionButton onClick={onClick} aria-label={ariaLabel} title={title}>
      <Download size={14} />
    </TableActionButton>
  );
}

