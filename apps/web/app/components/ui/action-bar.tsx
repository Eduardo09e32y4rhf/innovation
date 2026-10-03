import type React from 'react'

export function ActionBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`action-bar ${className}`}>{children}</div>
}
