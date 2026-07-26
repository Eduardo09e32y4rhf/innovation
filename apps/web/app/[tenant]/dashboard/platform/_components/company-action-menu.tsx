'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FileText, MoreVertical, Power, Settings, Archive, Users, ExternalLink } from 'lucide-react';
import { type PlatformCompany } from '@/app/lib/api';

interface CompanyActionMenuProps {
  company: PlatformCompany;
  tenant: string;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canManageLicenses: boolean;
  status: string;
  onToggleStatus: () => void;
  onDelete: () => void;
  loadingToggle: boolean;
  loadingDelete: boolean;
}

export function CompanyActionMenu({
  company,
  tenant,
  isSuperAdmin,
  canManageUsers,
  canManageLicenses,
  status,
  onToggleStatus,
  onDelete,
  loadingToggle,
  loadingDelete
}: CompanyActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-1 w-48 origin-top-right rounded-[10px] border border-slate-200 bg-white p-1 shadow-2xl ring-1 ring-black ring-opacity-5">
          <div className="flex flex-col">
            <Link 
              href={`/${tenant}/dashboard/platform/${company.id}?tab=general`} 
              className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <FileText size={14} className="text-slate-400" />
              Detalhes & Resumo
            </Link>

            {canManageUsers && (
              <Link 
                href={`/${tenant}/dashboard/platform/${company.id}?tab=users`} 
                onClick={() => setOpen(false)} 
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Users size={14} className="text-slate-400" />
                Usuários da Empresa
              </Link>
            )}

            {canManageLicenses && (
              <Link 
                href={`/${tenant}/dashboard/platform/${company.id}?tab=subscription`} 
                onClick={() => setOpen(false)} 
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Settings size={14} className="text-slate-400" />
                Assinatura & Plano
              </Link>
            )}

            {isSuperAdmin && (
              <>
                <div className="my-1 border-t border-slate-100"></div>
                <Link 
                  href={`/auth/ghost-init?companyId=${company.id}`} 
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-50"
                >
                  <ExternalLink size={14} />
                  Acessar como cliente
                </Link>
                
                <button 
                  onClick={() => { setOpen(false); onToggleStatus(); }} 
                  disabled={loadingToggle}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                >
                  <Power size={14} />
                  {status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                </button>
                
                <button 
                  onClick={() => { setOpen(false); onDelete(); }} 
                  disabled={loadingDelete}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Archive size={14} />
                  Arquivar empresa
                </button>
              </>
            )}
            
            {!canManageUsers && !isSuperAdmin && (
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-400">
                Acesso limitado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
