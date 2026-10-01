import { extensions } from '@wix/astro/builders'

export default extensions.sitePlugin({
  id: '03b75fb2-83e6-4edd-8aa1-fe710e4170da',
  name: 'product-file-upload',
  marketData: {
    name: 'Product File Upload',
    description: 'Let customers upload the files you need for this product right on the product page.',
    logoUrl: '{{BASE_URL}}/product-file-upload-logo.svg',
  },
  placements: [{
    appDefinitionId: 'a0c68605-c2e7-4c8d-9ea1-767f9770e087',
    widgetId: '6a25b678-53ec-4b37-a190-65fcd1ca1a63',
    slotId: 'product-page-details-7',
  }, {
    appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
    widgetId: '13a94f09-2766-3c40-4a32-8edb5acdd8bc',
    slotId: 'product-page-details-7',
  }],
  installation: { autoAdd: true },
  tagName: 'product-file-upload',
  element: './extensions/site/plugins/product-file-upload/product-file-upload.tsx',
  settings: './extensions/site/plugins/product-file-upload/product-file-upload.panel.tsx',
});
