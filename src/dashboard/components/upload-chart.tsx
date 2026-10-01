import { useI18n } from '../i18n/runtime';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/** Single-series bar chart of completed uploads per day (UTC). */
export function UploadChart({ daily }: { daily: { date: string; uploads: number }[] }) {
  const { m, plural, fill, formatNumber, formatChartDate } = useI18n();
  const max = Math.max(1, ...daily.map((d) => d.uploads));
  const total = daily.reduce((sum, d) => sum + d.uploads, 0);
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-36 items-end gap-[2px] border-b border-border" role="img" aria-label={plural(m.chart.total, total)}>
        {daily.map((d) => {
          const date = formatChartDate(d.date);
          return (
            <Tooltip key={d.date}>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-1 cursor-default items-end" tabIndex={0} aria-label={plural(m.chart.day, d.uploads, { date })}>
                  <div
                    className="w-full rounded-t-[4px] bg-primary transition-opacity hover:opacity-80"
                    style={{ height: d.uploads === 0 ? '0' : `${Math.max(4, (d.uploads / max) * 100)}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {plural(m.chart.tooltip, d.uploads, { date })}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{daily[0] ? formatChartDate(daily[0].date) : ''}</span>
        <span>{fill(m.chart.maxPerDay, { max: formatNumber(max) })}</span>
        <span>{daily[daily.length - 1] ? formatChartDate(daily[daily.length - 1]?.date ?? '') : ''}</span>
      </figcaption>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">{m.chart.viewAsTable}</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr><th className="text-start font-medium">{m.common.dateUtc}</th><th className="text-end font-medium">{m.common.files}</th></tr>
          </thead>
          <tbody>
            {daily.filter((d) => d.uploads > 0).map((d) => (
              <tr key={d.date}><td>{formatChartDate(d.date)}</td><td className="text-end">{formatNumber(d.uploads)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
