import { LifeBuoy } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useI18n } from '../i18n/runtime';

export function HelpView() {
  const { m } = useI18n();
  const faq = [
    { q: m.help.storageQ, a: m.help.storageA },
    { q: m.help.matchingQ, a: m.help.matchingA },
    { q: m.help.requiredQ, a: m.help.requiredA },
    { q: m.help.limitQ, a: m.help.limitA },
    { q: m.help.connectionQ, a: m.help.connectionA },
    { q: m.help.trialQ, a: m.help.trialA },
    { q: m.help.beforeCartQ, a: m.help.beforeCartA },
  ];
  const steps = [m.help.startPlugins, m.help.startProducts, m.help.startTest, m.help.startDownload];
  return (
    <div>
      <PageHeader title={m.help.title} description={m.help.description} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{m.help.faqTitle}</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y">
            {faq.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">{item.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{m.help.gettingStarted}</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
              <LifeBuoy className="mt-0.5 size-4 shrink-0" />
              <span>{m.help.contact}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
