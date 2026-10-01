import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import { ArrowLeft, ExternalLink, Search, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBytes } from '../../shared/file-rules';
import type { OrderFilesPage, OrderSummary, OrdersPage, UploadRecord, WixOrderDetails } from '../../shared/types';
import { FileActions } from '../components/file-actions';
import { PageHeader } from '../components/page-header';
import { LinkStatusBadge, UploadStatusBadge } from '../components/status-badge';
import { EmptyState, ErrorState, LoadingRows } from '../components/states';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge, type BadgeProps } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { formatDateTime } from '../lib/format';
import type { Navigate } from '../lib/navigation';
import { useCursorList } from '../lib/use-cursor-list';
import { useResource } from '../lib/use-resource';

const pickOrders = (page: OrdersPage) => page.orders;
const pickOrderFiles = (page: OrderFilesPage) => page.files;

function openWixOrder(orderId: string) {
  dashboard.navigate(pages.orderDetails({ id: orderId }));
}

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  APPROVED: 'success',
  PAID: 'success',
  FULFILLED: 'success',
  INITIALIZED: 'warning',
  PENDING: 'warning',
  NOT_PAID: 'warning',
  PARTIALLY_PAID: 'warning',
  NOT_FULFILLED: 'secondary',
  PARTIALLY_FULFILLED: 'warning',
  CANCELED: 'destructive',
  DECLINED: 'destructive',
  REFUNDED: 'secondary',
  PARTIALLY_REFUNDED: 'secondary',
};

function statusLabel(status: string): string {
  const text = status.replaceAll('_', ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function OrderStatus({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant={STATUS_VARIANT[status] ?? 'secondary'} className="w-fit">{statusLabel(status)}</Badge>
    </div>
  );
}

function OrderSummaryCard({ order }: { order: WixOrderDetails }) {
  const totals: [string, string | null][] = [
    ['Subtotal', order.totals.subtotal],
    ['Shipping', order.totals.shipping],
    ['Tax', order.totals.tax],
    ['Discount', order.totals.discount],
  ];
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Order details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4">
        <div className="flex flex-wrap gap-6">
          <OrderStatus label="Order" status={order.status} />
          <OrderStatus label="Payment" status={order.paymentStatus} />
          <OrderStatus label="Fulfillment" status={order.fulfillmentStatus} />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Customer</span>
            <span className="text-sm font-medium">{order.buyer.name ?? order.buyer.email ?? '—'}</span>
            {order.buyer.name && order.buyer.email ? <span className="text-xs text-muted-foreground">{order.buyer.email}</span> : null}
          </div>
        </div>
        {order.buyerNote ? <p className="rounded-md bg-muted p-3 text-sm"><span className="font-medium">Customer note: </span>{order.buyerNote}</p> : null}
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {order.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.image ? <img src={item.image} alt="" className="size-10 rounded object-cover" /> : null}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.options.length > 0 ? <p className="text-xs text-muted-foreground">{item.options.join(' · ')}</p> : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.price ?? '—'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.total ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
          {totals.filter(([, value]) => value !== null).map(([label, value]) => (
            <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>
          ))}
          <dt className="border-t pt-1 font-medium">Total</dt><dd className="border-t pt-1 text-right font-medium">{order.totals.total ?? '—'}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function OrderDetailView({ orderId, navigate }: { orderId: string; navigate: Navigate }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);
  const path = `/api/orders/${encodeURIComponent(orderId)}/files${query ? `?search=${encodeURIComponent(query)}` : ''}`;
  const list = useCursorList<OrderFilesPage, UploadRecord>(path, pickOrderFiles);
  const order = list.page?.order;
  const wixOrder = useResource<WixOrderDetails>(`/api/orders/${encodeURIComponent(orderId)}/wix`);
  const orderNumber = wixOrder.data?.number ?? order?.orderNumber ?? null;
  const placedAt = wixOrder.data?.createdAt ?? order?.createdAt ?? null;
  return (
    <div>
      <PageHeader
        title={orderNumber ? `Order #${orderNumber}` : 'Order files'}
        description={placedAt ? `Placed ${formatDateTime(placedAt)}` : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('orders')}><ArrowLeft /> All orders</Button>
            <Button variant="outline" onClick={() => openWixOrder(orderId)}><ExternalLink /> Open order</Button>
          </>
        }
      />
      {list.error && list.items.length === 0 ? <Card><ErrorState message={list.error} onRetry={list.reload} /></Card> : list.loading ? <Card><LoadingRows /></Card> : (
        <div className="flex flex-col gap-4">
          {wixOrder.data ? <OrderSummaryCard order={wixOrder.data} /> : wixOrder.loading ? <Card><LoadingRows rows={3} /></Card> : wixOrder.error ? <Card><ErrorState message={wixOrder.error} onRetry={wixOrder.reload} /></Card> : null}
          {order && order.unresolvedFiles > 0 ? (
            <Alert variant="warning">
              <div><AlertTitle>Some files need review</AlertTitle><AlertDescription>These files were attached in checkout, but the order’s line items didn’t match exactly. Check which item they belong to before fulfilling.</AlertDescription></div>
            </Alert>
          ) : null}
          <Card>
            <CardHeader className="gap-3 border-b">
              <CardTitle>Files</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search file or product" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search order files" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {list.items.length === 0 ? <EmptyState icon={ShoppingBag} title={query ? 'No matching files' : 'No files'} description={query ? 'Try a different file or product name.' : 'No files are attached to this order.'} /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Line item</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {list.items.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell><p className="max-w-64 truncate font-medium" title={file.fileName}>{file.fileName}</p><p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p></TableCell>
                        <TableCell>{file.productName ?? file.productId}</TableCell>
                        <TableCell><UploadStatusBadge status={file.status} /></TableCell>
                        <TableCell>{file.binding ? <LinkStatusBadge status={file.binding.linkStatus} /> : null}</TableCell>
                        <TableCell><FileActions upload={file} onDeleted={list.reload} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {list.hasMore ? <div className="flex justify-center border-t p-3"><Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? 'Loading…' : 'Load more files'}</Button></div> : null}
          </Card>
        </div>
      )}
    </div>
  );
}

export function OrdersView({ navigate, orderId }: { navigate: Navigate; orderId: string | null }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim().replace(/^#/, '')), 350);
    return () => clearTimeout(handle);
  }, [search]);
  const list = useCursorList<OrdersPage, OrderSummary>(`/api/orders${query ? `?search=${encodeURIComponent(query)}` : ''}`, pickOrders);

  if (orderId) return <OrderDetailView orderId={orderId} navigate={navigate} />;

  return (
    <div>
      <PageHeader title="Orders" description="Orders that include customer files. Open an order to download its files." />
      <Card>
        <div className="border-b p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by order number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
          </div>
        </div>
        {list.error && list.items.length === 0 ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingRows /> : list.items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={query ? 'No matching orders' : 'No orders with files yet'} description={query ? 'Check the order number.' : 'When a customer checks out with files attached, the order appears here.'} />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Placed</TableHead><TableHead>Files</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.items.map((order) => (
                <TableRow key={order.orderId} className="cursor-pointer" onClick={() => navigate('orders', { orderId: order.orderId })}>
                  <TableCell className="font-medium">#{order.orderNumber ?? order.orderId.slice(0, 8)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Badge variant="secondary">{order.linkedFiles + order.unresolvedFiles} file{order.linkedFiles + order.unresolvedFiles === 1 ? '' : 's'}</Badge>
                      {order.unresolvedFiles > 0 ? <Badge variant="warning">{order.unresolvedFiles} need review</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('orders', { orderId: order.orderId }); }}>View files</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {list.hasMore ? <div className="flex justify-center border-t p-3"><Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? 'Loading…' : 'Load more'}</Button></div> : null}
      </Card>
    </div>
  );
}
