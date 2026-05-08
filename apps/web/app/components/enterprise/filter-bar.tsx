'use client';

import React from 'react';
import { Search } from 'lucide-react';

export function FilterBar({
  searchValue,
  onSearchChange,
  children,
  placeholder = 'Buscar...'
}: {
  searchValue: string;
  onSearchChange: (next: string) => void;
  children?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      {children ? <div className="flex items-center gap-3">{children}</div> : null}
    </div>
  );
}

