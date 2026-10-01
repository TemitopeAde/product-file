import * as ProgressPrimitive from '@radix-ui/react-progress';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Progress({ className, value, indicatorClassName, ...props }: ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)} value={clamped} {...props}>
      <ProgressPrimitive.Indicator className={cn('h-full bg-primary transition-all', indicatorClassName)} style={{ width: `${clamped}%` }} />
    </ProgressPrimitive.Root>
  );
}
