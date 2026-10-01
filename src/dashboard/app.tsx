import { dashboard } from '@wix/dashboard';
import { CreditCard, FolderUp, HelpCircle, LayoutDashboard, Package, RefreshCw, Settings, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Toaster } from 'sonner';
import type { BillingSummary } from '../shared/types';
import { LanguageSelect } from './components/language-select';
import { TooltipProvider } from './components/ui/tooltip';
import { useI18n, LocaleProvider } from './i18n/runtime';
import { openExternal } from './lib/format';
import type { Navigate, ViewId } from './lib/navigation';
import { useResource } from './lib/use-resource';
import { cn } from './lib/utils';
import { BillingView } from './views/billing';
import { HelpView } from './views/help';
import { OrdersView } from './views/orders';
import { OverviewView } from './views/overview';
import { ProductsView } from './views/products';
import { SettingsView } from './views/settings';
import { UploadsView } from './views/uploads';

const NAV: { id: ViewId; label: 'overview' | 'products' | 'uploads' | 'orders' | 'billing' | 'settings' | 'help'; icon: LucideIcon }[] = [
  { id: 'overview', label: 'overview', icon: LayoutDashboard },
  { id: 'products', label: 'products', icon: Package },
  { id: 'uploads', label: 'uploads', icon: FolderUp },
  { id: 'orders', label: 'orders', icon: ShoppingBag },
  { id: 'billing', label: 'billing', icon: CreditCard },
  { id: 'settings', label: 'settings', icon: Settings },
  { id: 'help', label: 'help', icon: HelpCircle },
];

const MANAGE_INSTALLED_APPS_PAGE_ID = 'ad471122-7305-4007-9210-2a764d2e5e57';

interface Route {
  view: ViewId;
  params: Record<string, string>;
}

function DashboardApp() {
  const { m, intl, dir } = useI18n();
  const [route, setRoute] = useState<Route>({ view: 'overview', params: {} });
  const navigate: Navigate = useCallback((view, params = {}) => {
    setRoute({ view, params });
    window.scrollTo({ top: 0 });
  }, []);
  // The server builds this link from the app ID and the caller's verified instance ID, and offers
  // it only to Basic sites that can still start a trial.
  const billing = useResource<BillingSummary>('/api/billing');
  const trialUrl = billing.data?.actions.find((action) => action.type === 'START_TRIAL')?.url ?? null;

  return (
    <TooltipProvider delayDuration={150}>
      <div lang={intl} dir={dir} className="flex min-h-screen flex-col bg-background md:flex-row">
        <nav aria-label={m.app.navLabel} className="flex flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-e">
          <div className="hidden px-5 py-5 md:block">
            <p className="text-sm font-semibold">{m.app.name}</p>
            <p className="text-xs text-muted-foreground">{m.app.tagline}</p>
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
                    {m.nav[item.label]}
                  </button>
                </li>
              );
            })}
            <li className="ms-auto flex items-center gap-1 border-s ps-2 md:mt-auto md:ms-0 md:flex-col md:items-stretch md:border-s-0 md:border-t md:ps-0 md:pt-3">
              {trialUrl ? (
                <button
                  type="button"
                  onClick={() => openExternal(trialUrl)}
                  className="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  {m.nav.startTrial}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dashboard.navigate({ pageId: MANAGE_INSTALLED_APPS_PAGE_ID })}
                className="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                {m.nav.updateApp}
              </button>
              <LanguageSelect />
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
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ closeButtonAriaLabel: m.toaster.close }} containerAriaLabel={m.toaster.region} />
    </TooltipProvider>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <DashboardApp />
    </LocaleProvider>
  );
}
