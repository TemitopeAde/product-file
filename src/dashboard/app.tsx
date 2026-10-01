import { dashboard } from '@wix/dashboard';
import { CreditCard, FolderUp, HelpCircle, LayoutDashboard, Package, RefreshCw, Settings, ShoppingBag, type LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import type { Navigate, ViewId } from './lib/navigation';
import { cn } from './lib/utils';
import { BillingView } from './views/billing';
import { HelpView } from './views/help';
import { OrdersView } from './views/orders';
import { OverviewView } from './views/overview';
import { ProductsView } from './views/products';
import { SettingsView } from './views/settings';
import { UploadsView } from './views/uploads';

const NAV: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'uploads', label: 'Uploads', icon: FolderUp },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

const MANAGE_INSTALLED_APPS_PAGE_ID = 'ad471122-7305-4007-9210-2a764d2e5e57';

interface Route {
  view: ViewId;
  params: Record<string, string>;
}

export function App() {
  const [route, setRoute] = useState<Route>({ view: 'overview', params: {} });
  const navigate: Navigate = useCallback((view, params = {}) => {
    setRoute({ view, params });
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <nav aria-label="Product File Upload" className="flex flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <div className="hidden px-5 py-5 md:block">
            <p className="text-sm font-semibold">Product File Upload</p>
            <p className="text-xs text-muted-foreground">Customer files for orders</p>
          </div>
          <ul className="flex gap-1 overflow-x-auto p-2 md:min-h-0 md:flex-1 md:flex-col md:px-3 md:pb-3">
            {NAV.map((item) => {
              const active = route.view === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                      active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                </li>
              );
            })}
            <li className="ml-auto border-l pl-2 md:mt-auto md:ml-0 md:border-l-0 md:border-t md:pl-0 md:pt-3">
              <button
                type="button"
                onClick={() => dashboard.navigate({ pageId: MANAGE_INSTALLED_APPS_PAGE_ID })}
                className="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Update app
              </button>
            </li>
          </ul>
        </nav>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            {route.view === 'overview' ? <OverviewView navigate={navigate} /> : null}
            {route.view === 'products' ? <ProductsView /> : null}
            {route.view === 'uploads' ? <UploadsView navigate={navigate} /> : null}
            {route.view === 'orders' ? <OrdersView navigate={navigate} orderId={route.params['orderId'] ?? null} /> : null}
            {route.view === 'billing' ? <BillingView /> : null}
            {route.view === 'settings' ? <SettingsView /> : null}
            {route.view === 'help' ? <HelpView /> : null}
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  );
}
