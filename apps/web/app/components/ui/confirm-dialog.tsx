import * as React from "react"
import { Modal } from "./modal"
import { Button } from "./button"

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false
}: ConfirmDialogProps) {
  
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-2 pt-2">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button 
          variant={variant} 
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
