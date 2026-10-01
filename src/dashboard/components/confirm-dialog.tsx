import { useState } from 'react';
import { useI18n } from '../i18n/runtime';
import { Button, type ButtonProps } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonProps['variant'];
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, confirmVariant = 'destructive', onConfirm, onOpenChange }: ConfirmDialogProps) {
  const { m } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {m.common.cancel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConfirm().finally(() => {
                setBusy(false);
                onOpenChange(false);
              });
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
