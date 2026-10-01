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
import { formatDateTime, STATUS_LABEL } from '../lib/format';
import type { Navigate } from '../lib/navigation';
import { useCursorList } from '../lib/use-cursor-list';

const FILTERABLE: UploadStatus[] = ['READY', 'PROCESSING', 'UPLOADING', 'FAILED', 'DELETED'];
const pickUploads = (page: UploadsPage) => page.uploads;

export function UploadsView({ navigate }: { navigate: Navigate }) {
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
      <PageHeader title="Uploads" description="Every file customers uploaded, with its product and order. Files are private; downloads use links that expire after an hour." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search file, product, or order number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search uploads" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All active statuses</SelectItem>
              {FILTERABLE.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtered ? <Button variant="ghost" size="sm" onClick={() => { setStatus('ALL'); setSearch(''); }}>Clear filters</Button> : null}
        </div>
        {list.error && list.items.length === 0 ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingRows /> : list.items.length === 0 ? (
          <EmptyState
            icon={FolderUp}
            title={filtered ? 'No files match these filters' : 'No files yet'}
            description={filtered ? 'Try another status or search.' : 'When customers upload files on product pages or at checkout, they appear here.'}
            action={filtered ? undefined : <Button variant="outline" onClick={() => navigate('products')}>Turn on uploads for products</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>
                    <p className="max-w-64 truncate font-medium" title={upload.fileName}>{upload.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(upload.sizeBytes)} · {upload.source === 'CHECKOUT' ? 'Checkout' : 'Product page'}</p>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{upload.productName ?? upload.productId}</TableCell>
                  <TableCell>
                    <UploadStatusBadge status={upload.status} />
                    {upload.failureReason && upload.status === 'FAILED' ? <p className="mt-1 text-xs text-muted-foreground">{upload.failureReason.replaceAll('_', ' ').toLowerCase()}</p> : null}
                  </TableCell>
                  <TableCell>
                    {upload.binding?.orderId ? (
                      <Button variant="link" className="h-auto p-0" onClick={() => navigate('orders', { orderId: upload.binding?.orderId ?? '' })}>
                        #{upload.binding.orderNumber ?? upload.binding.orderId.slice(0, 8)}
                      </Button>
                    ) : <span className="text-muted-foreground">{upload.binding ? 'In checkout' : '—'}</span>}
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
            <Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? 'Loading…' : 'Load more'}</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
