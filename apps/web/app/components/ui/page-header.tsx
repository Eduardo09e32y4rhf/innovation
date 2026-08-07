import * as React from "react"

export interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, eyebrow, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-content">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-description">{subtitle}</p>}
      </div>
      {actions && (
        <div className="page-actions mt-4 sm:mt-0 flex-shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
