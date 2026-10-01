import { CheckCircle2, Clock, Loader2, Trash2, XCircle } from 'lucide-react';
import type { LinkStatus, UploadStatus } from '../../shared/types';
import { STATUS_LABEL } from '../lib/format';
import { Badge } from './ui/badge';

export function UploadStatusBadge({ status }: { status: UploadStatus }) {
  switch (status) {
    case 'READY':
      return <Badge variant="success"><CheckCircle2 />{STATUS_LABEL[status]}</Badge>;
    case 'FAILED':
    case 'EXPIRED':
      return <Badge variant="destructive"><XCircle />{STATUS_LABEL[status]}</Badge>;
    case 'CANCELLED':
    case 'DELETED':
      return <Badge variant="secondary"><Trash2 />{STATUS_LABEL[status]}</Badge>;
    case 'PROCESSING':
    case 'UPLOADING':
      return <Badge variant="default"><Loader2 className="animate-spin" />{STATUS_LABEL[status]}</Badge>;
    case 'RESERVED':
      return <Badge variant="secondary"><Clock />{STATUS_LABEL[status]}</Badge>;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  if (status === 'LINKED') return <Badge variant="success">Linked to line item</Badge>;
  if (status === 'UNRESOLVED') return <Badge variant="warning">Needs review</Badge>;
  return <Badge variant="secondary">Awaiting order</Badge>;
}
