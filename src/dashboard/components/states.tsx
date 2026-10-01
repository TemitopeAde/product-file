import { AlertCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/runtime';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  const { m } = useI18n();
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label={m.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { m, errorMessage } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {m.common.tryAgain}
      </Button>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-2 rounded-full bg-primary/10 p-3 text-primary">
        <Icon className="size-6" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
