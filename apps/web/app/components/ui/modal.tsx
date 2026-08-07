import * as React from "react"
import { X } from "lucide-react"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className={`modal z-50 w-full ${maxWidth} mx-4 shadow-[var(--shadow-xl)] animate-in fade-in zoom-in-95 duration-200`}>
        {(title || description) && (
          <div className="modal-header">
            <div>
              {title && <h2 className="modal-title">{title}</h2>}
              {description && <p className="modal-description mt-1 text-sm text-zinc-500">{description}</p>}
            </div>
            <button 
              onClick={onClose} 
              className="btn-icon" 
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className="modal-body p-6">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
