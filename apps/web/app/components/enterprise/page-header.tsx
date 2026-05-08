'use client';

import React from 'react';
import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" aria-label="breadcrumb">
            {breadcrumbs.map((item, idx) => (
              <React.Fragment key={`${item.label}-${idx}`}>
                {idx > 0 ? <span className="text-gray-600/80">/</span> : null}
                {item.href ? (
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-400">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        <h1 className="text-3xl font-extrabold tracking-tight break-words">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-gray-400 max-w-3xl">{subtitle}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

