import { ConfirmDialog, type ConfirmDialogProps } from '@/app/components/ui';
import { useAccessOverlay } from './use-access-overlay';

export function AccessConfirmDialog(props: ConfirmDialogProps) {
  const ref = useAccessOverlay(props.isOpen, () => { if (!props.isLoading) props.onClose(); }, props.title);
  return <div ref={ref}><ConfirmDialog {...props} /></div>;
}
