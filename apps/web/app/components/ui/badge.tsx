import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-zinc-100 text-zinc-700',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/50',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/50',
  }

  return (
    <span 
      className={`badge ${variantClasses[variant]} ${className}`}
      {...props} 
    />
  )
}
