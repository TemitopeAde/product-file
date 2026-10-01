import { FolderUp, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBytes } from '../../shared/file-rules';
import type { UploadRecord, UploadsPage, UploadStatus } from '../../shared/types';
import { FileActions } from '../components/file-actions';
import { PageHeader } from '../components/page-header';
import { UploadStatusBadge } from '../components/status-badge';
import { EmptyState, ErrorState, LoadingRows } from '../components/states';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useI18n } from '../i18n/runtime';
import type { Navigate } from '../lib/navigation';
import { useCursorList } from '../lib/use-cursor-list';

const FILTERABLE: UploadStatus[] = ['READY', 'PROCESSING', 'UPLOADING', 'FAILED', 'DELETED'];
const pickUploads = (page: UploadsPage) => page.uploads;

export function UploadsView({ navigate }: { navigate: Navigate }) {
  const { m, label, formatDateTime } = useI18n();
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);

  const params = new URLSearchParams();
  if (status !== 'ALL') params.set('status', status);
  if (query) params.set('search', query);
  const list = useCursorList<UploadsPage, UploadRecord>(`/api/uploads${params.size ? `?${params.toString()}` : ''}`, pickUploads);
  const filtered = status !== 'ALL' || query !== '';

  return (
    <div>
      <PageHeader title={m.uploads.title} description={m.uploads.description} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" placeholder={m.uploads.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={m.uploads.searchLabel} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label={m.uploads.filterLabel}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{m.uploads.allStatuses}</SelectItem>
              {FILTERABLE.map((s) => <SelectItem key={s} value={s}>{m.uploadStatus[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtered ? <Button variant="ghost" size="sm" onClick={() => { setStatus('ALL'); setSearch(''); }}>{m.uploads.clearFilters}</Button> : null}
        </div>
        {list.error && list.items.length === 0 ? <ErrorState error={list.error} onRetry={list.reload} /> : list.loading ? <LoadingRows /> : list.items.length === 0 ? (
          <EmptyState
            icon={FolderUp}
            title={filtered ? m.uploads.noMatches : m.uploads.empty}
            description={filtered ? m.uploads.noMatchesBody : m.uploads.emptyBody}
            action={filtered ? undefined : <Button variant="outline" onClick={() => navigate('products')}>{m.uploads.turnOn}</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.common.file}</TableHead>
                <TableHead>{m.common.product}</TableHead>
                <TableHead>{m.common.status}</TableHead>
                <TableHead>{m.common.order}</TableHead>
                <TableHead>{m.uploads.uploaded}</TableHead>
                <TableHead className="text-end">{m.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>
                    <p className="max-w-64 truncate font-medium" title={upload.fileName}>{upload.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(upload.sizeBytes)} · {upload.source === 'CHECKOUT' ? m.source.checkout : m.source.productPage}</p>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{upload.productName ?? upload.productId}</TableCell>
                  <TableCell>
                    <UploadStatusBadge status={upload.status} />
                    {upload.failureReason && upload.status === 'FAILED' ? <p className="mt-1 text-xs text-muted-foreground">{label(m.failure, upload.failureReason, m.failure.unknown)}</p> : null}
                  </TableCell>
                  <TableCell>
                    {upload.binding?.orderId ? (
                      <Button variant="link" className="h-auto p-0" onClick={() => navigate('orders', { orderId: upload.binding?.orderId ?? '' })}>
                        #{upload.binding.orderNumber ?? upload.binding.orderId.slice(0, 8)}
                      </Button>
                    ) : <span className="text-muted-foreground">{upload.binding ? m.source.inCheckout : m.common.empty}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(upload.createdAt)}</TableCell>
                  <TableCell><FileActions upload={upload} onDeleted={list.reload} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {list.hasMore ? (
          <div className="flex justify-center border-t p-3">
            <Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? m.common.loadingEllipsis : m.uploads.loadMore}</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
