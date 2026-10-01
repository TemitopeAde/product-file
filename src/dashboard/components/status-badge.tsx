import { CheckCircle2, Clock, Loader2, Trash2, XCircle } from 'lucide-react';
import type { LinkStatus, UploadStatus } from '../../shared/types';
import { useI18n } from '../i18n/runtime';
import { Badge } from './ui/badge';

export function UploadStatusBadge({ status }: { status: UploadStatus }) {
  const { m } = useI18n();
  const label = m.uploadStatus[status];
  switch (status) {
    case 'READY':
      return <Badge variant="success"><CheckCircle2 />{label}</Badge>;
    case 'FAILED':
    case 'EXPIRED':
      return <Badge variant="destructive"><XCircle />{label}</Badge>;
    case 'CANCELLED':
    case 'DELETED':
      return <Badge variant="secondary"><Trash2 />{label}</Badge>;
    case 'PROCESSING':
    case 'UPLOADING':
      return <Badge variant="default"><Loader2 className="animate-spin" />{label}</Badge>;
    case 'RESERVED':
      return <Badge variant="secondary"><Clock />{label}</Badge>;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  const { m } = useI18n();
  if (status === 'LINKED') return <Badge variant="success">{m.linkStatus.LINKED}</Badge>;
  if (status === 'UNRESOLVED') return <Badge variant="warning">{m.linkStatus.UNRESOLVED}</Badge>;
  return <Badge variant="secondary">{m.linkStatus.PENDING}</Badge>;
}
