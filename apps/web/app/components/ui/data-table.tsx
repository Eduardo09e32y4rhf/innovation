import * as React from "react"

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="table-responsive-shell w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <thead ref={ref} className={`border-b border-zinc-200 bg-zinc-50/50 ${className}`} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    />
  )
)
TableBody.displayName = "TableBody"

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50/50 data-[state=selected]:bg-zinc-100 ${className}`}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-semibold text-zinc-500 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <td
      ref={ref}
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

/**
 * Alternative presentation for narrow screens. Keep the same data source as
 * the desktop table and use this component when a row has too many columns
 * to remain useful below the tablet breakpoint.
 */
export function MobileRecordCard({
  title,
  subtitle,
  meta,
  actions,
  children,
  className = '',
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <article className={`mobile-record-card ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-zinc-900">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {meta && <div className="mt-3 text-xs text-zinc-500">{meta}</div>}
      {children && <div className="mt-3 grid gap-2 text-xs text-zinc-700">{children}</div>}
    </article>
  )
}

export function TableResponsiveFallback({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`md:hidden ${className}`}>{children}</div>
}
