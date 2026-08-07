import * as React from "react"
import type { LucideIcon } from "lucide-react"

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: string | number
    isPositive: boolean
    label: string
  }
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className = '', title, value, icon: Icon, iconColor = 'text-[var(--color-brand)]', trend, ...props }, ref) => (
    <div ref={ref} className={`stat-card ${className}`} {...props}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-card-label">{title}</p>
          <p className="stat-card-value mt-1">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              <span>{trend.isPositive ? '+' : '-'}{trend.value}</span>
              <span className="text-zinc-500 font-medium">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-white/50 border border-white ${iconColor} shadow-sm`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
)
StatCard.displayName = "StatCard"
