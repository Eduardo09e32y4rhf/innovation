import * as React from "react"
import { ArrowUpRight, type LucideIcon } from "lucide-react"

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: React.ReactNode
  icon: LucideIcon
  detail?: string
  trend?: string
  trendColor?: string
  alert?: boolean
  loading?: boolean
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className = '', title, value, icon: Icon, detail, trend, trendColor = 'emerald', alert = false, loading = false, ...props }, ref) => (
    <div ref={ref} className={`relative group p-5 flex flex-col gap-1 transition-all hover:shadow-lg rounded-[16px] border border-white/20 bg-white/40 shadow-sm backdrop-blur-xl ${className}`} {...props}>
      {alert && <div className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-[var(--color-brand)]" />}
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        <Icon size={14} className="text-slate-400 group-hover:text-[var(--color-brand)] transition-colors" />
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none mt-2">
        {loading && value === undefined ? '--' : value ?? '0'}
      </p>
      {(detail || trend) && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">{detail ? `Atualizado hoje • ${detail}` : 'Atualizado hoje'}</p>
          {trend && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-700">
              <ArrowUpRight size={10} strokeWidth={3} />
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  )
)
StatCard.displayName = "StatCard"
