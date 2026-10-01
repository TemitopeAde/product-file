import { ImageOff, Package, Search, Settings2, ToggleRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatBytes } from '../../shared/file-rules';
import type { EnableAllProductsResult, ProductRule, ProductsPage, ProductSummary, SettingsResponse } from '../../shared/types';
import { ConfirmDialog } from '../components/confirm-dialog';
import { PageHeader } from '../components/page-header';
import { EmptyState, ErrorState, LoadingRows } from '../components/states';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useI18n } from '../i18n/runtime';
import { api } from '../lib/api';
import { useResource } from '../lib/use-resource';
import { RuleDialog } from './rule-dialog';

function RuleSummary({ rule }: { rule: ProductRule | null }) {
  const { m, fill, plural } = useI18n();
  if (!rule || !rule.enabled) return <Badge variant="secondary">{m.common.off}</Badge>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <Badge variant="success">{m.common.on}</Badge>
        {rule.requirement === 'REQUIRED' ? <Badge variant="default">{m.products.required}</Badge> : <Badge variant="outline">{m.products.optional}</Badge>}
      </div>
      <span className="text-xs text-muted-foreground">{fill(m.products.ruleSummary, { types: rule.acceptedTypes.join(', '), size: formatBytes(rule.maxFileSizeBytes), files: plural(m.plural.files, rule.maxFiles) })}</span>
    </div>
  );
}

export function ProductsView() {
  const { m, plural, errorMessage } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState<ProductSummary | null>(null);
  const [confirmEnableAll, setConfirmEnableAll] = useState(false);
  const settings = useResource<SettingsResponse>('/api/settings');
  const page = useResource<ProductsPage>(`/api/products${query ? `?search=${encodeURIComponent(query)}` : ''}`);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!page.data) return;
    setProducts(page.data.products);
    setNextCursor(page.data.nextCursor);
  }, [page.data]);

  useEffect(() => {
    setProducts([]);
    setNextCursor(null);
  }, [query]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor: nextCursor, ...(query ? { search: query } : {}) });
      const more = await api<ProductsPage>(`/api/products?${params.toString()}`);
      setProducts((current) => [...current, ...more.products]);
      setNextCursor(more.nextCursor);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const defaults = useMemo(() => settings.data?.settings.defaults ?? { acceptedTypes: ['image/*', 'application/pdf'], maxFileSizeBytes: 50 * 1024 * 1024, maxFiles: 3 }, [settings.data]);
  const verified = settings.data?.checkoutVerification.verifiedAt != null;

  const enableAll = async () => {
    try {
      const result = await api<EnableAllProductsResult>('/api/products/enable-all', { method: 'POST' });
      toast.success(plural(m.toasts.enabledProducts, result.updated));
      page.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader title={m.products.title} description={m.products.description} />
      {page.data?.catalogVersion === 'STORES_NOT_INSTALLED' ? (
        <Card><EmptyState icon={Package} title={m.products.storesMissing} description={m.products.storesMissingBody} /></Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="ps-9" placeholder={m.products.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={m.products.searchLabel} />
            </div>
            <Button variant="outline" onClick={() => setConfirmEnableAll(true)} disabled={!settings.data || page.loading}>
              <ToggleRight /> {m.products.enableAll}
            </Button>
            {!verified && settings.data ? (
              <Alert variant="info" className="flex-1 py-2"><AlertDescription>{m.products.requiredLocked}</AlertDescription></Alert>
            ) : null}
          </div>
          {page.error ? <ErrorState error={page.error} onRetry={page.reload} /> : page.loading && products.length === 0 ? <LoadingRows /> : products.length === 0 ? (
            <EmptyState icon={Package} title={query ? m.products.noMatches : m.products.empty} description={query ? m.products.noMatchesBody : m.products.emptyBody} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.common.product}</TableHead>
                  <TableHead>{m.products.fileUploads}</TableHead>
                  <TableHead className="w-32 text-end">{m.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer" onClick={() => setEditing(product)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-10 rounded-md border object-cover" /> : <div className="flex size-10 items-center justify-center rounded-md border bg-muted"><ImageOff className="size-4 text-muted-foreground" /></div>}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {!product.visible ? <p className="text-xs text-muted-foreground">{m.products.hidden}</p> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RuleSummary rule={product.rule} /></TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(product); }}>
                        <Settings2 /> {m.products.configure}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {nextCursor ? (
            <div className="flex justify-center border-t p-3">
              <Button variant="ghost" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? m.common.loadingEllipsis : m.products.loadMore}</Button>
            </div>
          ) : null}
        </Card>
      )}
      <RuleDialog
        product={editing}
        defaults={defaults}
        checkoutVerified={verified}
        onClose={() => setEditing(null)}
        onSaved={(productId, rule) => {
          setProducts((current) => current.map((p) => (p.id === productId ? { ...p, rule } : p)));
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={confirmEnableAll}
        title={m.products.confirmTitle}
        description={m.products.confirmBody}
        confirmLabel={m.products.confirmAction}
        confirmVariant="default"
        onConfirm={enableAll}
        onOpenChange={setConfirmEnableAll}
      />
    </div>
  );
}
