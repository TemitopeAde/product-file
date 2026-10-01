import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/** Single-series bar chart of completed uploads per day (UTC). */
export function UploadChart({ daily }: { daily: { date: string; uploads: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.uploads));
  const total = daily.reduce((sum, d) => sum + d.uploads, 0);
  const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-36 items-end gap-[2px] border-b border-border" role="img" aria-label={`${total} files uploaded in the last 30 days`}>
        {daily.map((d) => (
          <Tooltip key={d.date}>
            <TooltipTrigger asChild>
              <div className="flex h-full flex-1 cursor-default items-end" tabIndex={0} aria-label={`${label(d.date)}: ${d.uploads} files`}>
                <div
                  className="w-full rounded-t-[4px] bg-primary transition-opacity hover:opacity-80"
                  style={{ height: d.uploads === 0 ? '0' : `${Math.max(4, (d.uploads / max) * 100)}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {label(d.date)} · {d.uploads} file{d.uploads === 1 ? '' : 's'}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{daily[0] ? label(daily[0].date) : ''}</span>
        <span>Max {max} per day</span>
        <span>{daily[daily.length - 1] ? label(daily[daily.length - 1]?.date ?? '') : ''}</span>
      </figcaption>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr><th className="text-left font-medium">Date (UTC)</th><th className="text-right font-medium">Files</th></tr>
          </thead>
          <tbody>
            {daily.filter((d) => d.uploads > 0).map((d) => (
              <tr key={d.date}><td>{label(d.date)}</td><td className="text-right">{d.uploads}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
