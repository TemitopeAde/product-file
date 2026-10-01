import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { UploadRecord } from '../../shared/types';
import { fill, translateError, useI18n } from '../i18n/runtime';
import { api } from '../lib/api';
import { openExternal } from '../lib/format';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './ui/button';

export async function downloadFile(upload: UploadRecord): Promise<void> {
  try {
    const { url } = await api<{ url: string }>(`/api/uploads/${upload.id}/download`, { method: 'POST' });
    openExternal(url);
  } catch (error) {
    toast.error(translateError(error));
  }
}

export function FileActions({ upload, onDeleted }: { upload: UploadRecord; onDeleted?: () => void }) {
  const { m } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const canDelete = upload.status !== 'DELETED' && upload.status !== 'CANCELLED' && upload.status !== 'EXPIRED';
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={fill(m.common.downloadFile, { name: upload.fileName })} disabled={upload.status !== 'READY'} onClick={() => void downloadFile(upload)}>
        <Download />
      </Button>
      {onDeleted ? (
        <Button variant="ghost" size="icon" aria-label={fill(m.common.deleteFile, { name: upload.fileName })} disabled={!canDelete} onClick={() => setConfirming(true)}>
          <Trash2 />
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={m.files.deleteTitle}
        description={fill(m.files.deleteBody, { name: upload.fileName })}
        confirmLabel={m.files.deleteAction}
        onConfirm={async () => {
          try {
            await api(`/api/uploads/${upload.id}`, { method: 'DELETE' });
            toast.success(m.toasts.fileDeleted);
            onDeleted?.();
          } catch (error) {
            toast.error(translateError(error));
          }
        }}
      />
    </div>
  );
}
