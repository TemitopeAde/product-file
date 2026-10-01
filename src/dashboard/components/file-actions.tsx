import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { UploadRecord } from '../../shared/types';
import { api, errorText } from '../lib/api';
import { openExternal } from '../lib/format';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './ui/button';

export async function downloadFile(upload: UploadRecord): Promise<void> {
  try {
    const { url } = await api<{ url: string }>(`/api/uploads/${upload.id}/download`, { method: 'POST' });
    openExternal(url);
  } catch (error) {
    toast.error(errorText(error));
  }
}

export function FileActions({ upload, onDeleted }: { upload: UploadRecord; onDeleted?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const canDelete = upload.status !== 'DELETED' && upload.status !== 'CANCELLED' && upload.status !== 'EXPIRED';
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Download ${upload.fileName}`} disabled={upload.status !== 'READY'} onClick={() => void downloadFile(upload)}>
        <Download />
      </Button>
      {onDeleted ? (
        <Button variant="ghost" size="icon" aria-label={`Delete ${upload.fileName}`} disabled={!canDelete} onClick={() => setConfirming(true)}>
          <Trash2 />
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this file?"
        description={`"${upload.fileName}" moves to the Media Manager trash and is removed from its order. Deleted files still count toward this month's uploads.`}
        confirmLabel="Delete file"
        onConfirm={async () => {
          try {
            await api(`/api/uploads/${upload.id}`, { method: 'DELETE' });
            toast.success('File deleted');
            onDeleted?.();
          } catch (error) {
            toast.error(errorText(error));
          }
        }}
      />
    </div>
  );
}
