import { LifeBuoy } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const FAQ: { q: string; a: string }[] = [
  { q: 'Where are customer files stored?', a: 'In your site’s Wix Media Manager, as private files in the “product-file-uploads” folder. Only you can download them, using links that expire after an hour.' },
  { q: 'How are files matched to orders?', a: 'At checkout, each file is attached to a specific line item, so the same product bought twice keeps separate files. When the order is created, files are linked by that exact line item. Anything that can’t be matched exactly is flagged “Needs review” instead of guessed.' },
  { q: 'What does “Required” do?', a: 'Checkout shows an error on the item and the order can’t be placed until a file for that item has finished uploading. It unlocks after one verified test order on your site.' },
  { q: 'What counts toward the monthly limit?', a: 'Each file that finishes uploading counts once. Retries, pauses, and resumed uploads don’t count again, and cancelled, failed, or expired uploads free their slot. Basic resets monthly on your install date (UTC).' },
  { q: 'What happens if a customer loses connection?', a: 'The upload pauses and resumes automatically when they’re back online. If they reload the page, choosing the same file resumes it.' },
  { q: 'What if my trial ends or I change plans?', a: 'Your files, orders, and product settings are kept. Basic limits apply again from the next upload.' },
  { q: 'Can customers upload before adding to cart?', a: 'Yes. Files uploaded on the product page wait for checkout, where they’re attached to the item automatically when there’s only one match, or the customer picks the item.' },
];

export function HelpView() {
  return (
    <div>
      <PageHeader title="Help" description="How Product File Upload works." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Frequently asked questions</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">{item.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Add the product page uploader and checkout plugin (Dashboard → Setup).</li>
              <li>Turn on uploads for products and choose file types and limits.</li>
              <li>Place a test order with a file to verify checkout.</li>
              <li>Download files from Orders or from the order page in Wix.</li>
            </ol>
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
              <LifeBuoy className="mt-0.5 size-4 shrink-0" />
              <span>Need help? Contact us through the app’s page in the Wix App Market.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
