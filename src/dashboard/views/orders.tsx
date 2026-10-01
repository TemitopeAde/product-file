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
import { useI18n } from '../i18n/runtime';
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
  PENDING_MERCHANT: 'warning',
  NOT_PAID: 'warning',
  PARTIALLY_PAID: 'warning',
  NOT_FULFILLED: 'secondary',
  PARTIALLY_FULFILLED: 'warning',
  CANCELED: 'destructive',
  DECLINED: 'destructive',
  REJECTED: 'destructive',
  REFUNDED: 'secondary',
  FULLY_REFUNDED: 'secondary',
  PARTIALLY_REFUNDED: 'secondary',
  UNSPECIFIED: 'secondary',
  UNKNOWN: 'secondary',
};

function OrderStatus({ label, status }: { label: string; status: string }) {
  const { m, label: named } = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant={STATUS_VARIANT[status] ?? 'secondary'} className="w-fit">{named(m.orderStatus, status, m.orderStatus.unknown)}</Badge>
    </div>
  );
}

function OrderSummaryCard({ order }: { order: WixOrderDetails }) {
  const { m } = useI18n();
  const totals: [string, string | null][] = [
    [m.orders.subtotal, order.totals.subtotal],
    [m.orders.shipping, order.totals.shipping],
    [m.orders.tax, order.totals.tax],
    [m.orders.discount, order.totals.discount],
  ];
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{m.orders.details}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4">
        <div className="flex flex-wrap gap-6">
          <OrderStatus label={m.common.order} status={order.status} />
          <OrderStatus label={m.orders.payment} status={order.paymentStatus} />
          <OrderStatus label={m.orders.fulfillment} status={order.fulfillmentStatus} />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{m.orders.customer}</span>
            <span className="text-sm font-medium">{order.buyer.name ?? order.buyer.email ?? m.common.empty}</span>
            {order.buyer.name && order.buyer.email ? <span className="text-xs text-muted-foreground">{order.buyer.email}</span> : null}
          </div>
        </div>
        {order.buyerNote ? <p className="rounded-md bg-muted p-3 text-sm"><span className="font-medium">{m.orders.customerNote}</span>{order.buyerNote}</p> : null}
        <Table>
          <TableHeader><TableRow><TableHead>{m.orders.item}</TableHead><TableHead className="text-end">{m.orders.price}</TableHead><TableHead className="text-end">{m.orders.qty}</TableHead><TableHead className="text-end">{m.orders.total}</TableHead></TableRow></TableHeader>
          <TableBody>
            {order.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.image ? <img src={item.image} alt="" className="size-10 rounded object-cover" /> : null}
                    <div>
                      <p className="font-medium">{item.name ?? m.orders.unnamedItem}</p>
                      {item.options.length > 0 ? <p className="text-xs text-muted-foreground">{item.options.join(' · ')}</p> : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-end">{item.price ?? m.common.empty}</TableCell>
                <TableCell className="text-end">{item.quantity}</TableCell>
                <TableCell className="text-end">{item.total ?? m.common.empty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <dl className="ms-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
          {totals.filter(([, value]) => value !== null).map(([rowLabel, value]) => (
            <div key={rowLabel} className="contents"><dt className="text-muted-foreground">{rowLabel}</dt><dd className="text-end">{value}</dd></div>
          ))}
          <dt className="border-t pt-1 font-medium">{m.orders.total}</dt><dd className="border-t pt-1 text-end font-medium">{order.totals.total ?? m.common.empty}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function OrderDetailView({ orderId, navigate }: { orderId: string; navigate: Navigate }) {
  const { m, fill, formatDateTime } = useI18n();
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
        title={orderNumber ? fill(m.orders.orderNumber, { number: orderNumber }) : m.orders.orderFiles}
        description={placedAt ? fill(m.orders.placedAt, { date: formatDateTime(placedAt) }) : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('orders')}><ArrowLeft /> {m.orders.allOrders}</Button>
            <Button variant="outline" onClick={() => openWixOrder(orderId)}><ExternalLink /> {m.orders.openOrder}</Button>
          </>
        }
      />
      {list.error && list.items.length === 0 ? <Card><ErrorState error={list.error} onRetry={list.reload} /></Card> : list.loading ? <Card><LoadingRows /></Card> : (
        <div className="flex flex-col gap-4">
          {wixOrder.data ? <OrderSummaryCard order={wixOrder.data} /> : wixOrder.loading ? <Card><LoadingRows rows={3} /></Card> : wixOrder.error ? <Card><ErrorState error={wixOrder.error} onRetry={wixOrder.reload} /></Card> : null}
          {order && order.unresolvedFiles > 0 ? (
            <Alert variant="warning">
              <div><AlertTitle>{m.orders.reviewTitle}</AlertTitle><AlertDescription>{m.orders.reviewBody}</AlertDescription></div>
            </Alert>
          ) : null}
          <Card>
            <CardHeader className="gap-3 border-b">
              <CardTitle>{m.orders.filesTitle}</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="ps-9" placeholder={m.orders.fileSearchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} aria-label={m.orders.fileSearchLabel} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {list.items.length === 0 ? <EmptyState icon={ShoppingBag} title={query ? m.orders.noFileMatches : m.orders.noFiles} description={query ? m.orders.noFileMatchesBody : m.orders.noFilesBody} /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>{m.common.file}</TableHead><TableHead>{m.common.product}</TableHead><TableHead>{m.common.status}</TableHead><TableHead>{m.orders.lineItem}</TableHead><TableHead className="text-end">{m.common.actions}</TableHead></TableRow></TableHeader>
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
            {list.hasMore ? <div className="flex justify-center border-t p-3"><Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? m.common.loadingEllipsis : m.orders.loadMore}</Button></div> : null}
          </Card>
        </div>
      )}
    </div>
  );
}

export function OrdersView({ navigate, orderId }: { navigate: Navigate; orderId: string | null }) {
  const { m, plural, formatDateTime } = useI18n();
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
      <PageHeader title={m.orders.title} description={m.orders.description} />
      <Card>
        <div className="border-b p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" placeholder={m.orders.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={m.orders.searchLabel} />
          </div>
        </div>
        {list.error && list.items.length === 0 ? <ErrorState error={list.error} onRetry={list.reload} /> : list.loading ? <LoadingRows /> : list.items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={query ? m.orders.noMatches : m.orders.empty} description={query ? m.orders.noMatchesBody : m.orders.emptyBody} />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>{m.common.order}</TableHead><TableHead>{m.orders.placed}</TableHead><TableHead>{m.common.files}</TableHead><TableHead className="text-end">{m.common.actions}</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.items.map((order) => {
                const fileCount = order.linkedFiles + order.unresolvedFiles;
                return (
                  <TableRow key={order.orderId} className="cursor-pointer" onClick={() => navigate('orders', { orderId: order.orderId })}>
                    <TableCell className="font-medium">#{order.orderNumber ?? order.orderId.slice(0, 8)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary">{plural(m.plural.files, fileCount)}</Badge>
                        {order.unresolvedFiles > 0 ? <Badge variant="warning">{plural(m.orders.needReview, order.unresolvedFiles)}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-end"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('orders', { orderId: order.orderId }); }}>{m.orders.viewFiles}</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {list.hasMore ? <div className="flex justify-center border-t p-3"><Button variant="ghost" disabled={list.loadingMore} onClick={() => void list.loadMore()}>{list.loadingMore ? m.common.loadingEllipsis : m.common.loadMore}</Button></div> : null}
      </Card>
    </div>
  );
}
