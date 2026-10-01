import { extensions } from '@wix/astro/builders'

export default extensions.sitePlugin({
  id: 'fbadca6d-9bd1-4951-a4f4-e32f77c945db',
  name: 'checkout-file-upload',
  marketData: {
    name: 'Checkout File Attachments',
    description: 'Customers attach their uploaded files to each item before placing the order.',
    logoUrl: '{{BASE_URL}}/checkout-file-upload-logo.svg',
  },
  placements: [{
    appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
    widgetId: '14fd5970-8072-c276-1246-058b79e70c1a',
    slotId: 'checkout:summary:lineItems:after',
  }],
  installation: { autoAdd: false },
  tagName: 'checkout-file-upload',
  element: './extensions/site/plugins/checkout-file-upload/checkout-file-upload.tsx',
  settings: './extensions/site/plugins/checkout-file-upload/checkout-file-upload.panel.tsx',
});
