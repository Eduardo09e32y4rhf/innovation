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
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const running = React.useRef(false);
  React.useEffect(() => { if (isOpen) setError(null); }, [isOpen]);
  const busy = isLoading || pending;
  const handleConfirm = async () => {
    if (running.current || busy) return;
    running.current = true;
    setPending(true);
    setError(null);
    try { await onConfirm(); }
    catch { setError('Não foi possível concluir. Tente novamente.'); }
    finally { running.current = false; setPending(false); }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      maxWidth="max-w-md"
    >
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={busy}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant}
          onClick={handleConfirm}
          isLoading={busy}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
