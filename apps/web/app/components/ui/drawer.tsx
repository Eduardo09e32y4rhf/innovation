import * as React from "react"
import { X } from "lucide-react"

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Drawer({ isOpen, onClose, title, description, children, footer, maxWidth = 'max-w-md' }: DrawerProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Drawer Content */}
      <div className={`drawer z-50 h-full w-full ${maxWidth} bg-white shadow-[var(--shadow-xl)] animate-in slide-in-from-right duration-300 flex flex-col`}>
        {(title || description) && (
          <div className="drawer-header p-6 border-b border-zinc-100 flex items-start justify-between">
            <div>
              {title && <h2 className="text-xl font-bold tracking-tight text-zinc-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
            </div>
            <button 
              onClick={onClose} 
              className="btn-icon rounded-full hover:bg-zinc-100 p-2 text-zinc-500 transition-colors" 
              aria-label="Fechar drawer"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className="drawer-body flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="drawer-footer p-6 border-t border-zinc-100 bg-zinc-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
