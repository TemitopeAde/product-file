import { app } from '@wix/astro/builders';

import productFiles from './extensions/dashboard/pages/product-files/product-files.extension.ts';

import productFileUpload from './extensions/site/plugins/product-file-upload/product-file-upload.extension.ts';

import checkoutFileUpload from './extensions/site/plugins/checkout-file-upload/checkout-file-upload.extension.ts';

import customerFiles from './extensions/dashboard/plugins/customer-files/customer-files.extension.ts';

import requiredFiles from './extensions/backend/service-plugins/required-files/required-files.extension.ts';

import orderCreated from './extensions/backend/events/order-created/order-created.extension.ts';

import orderUpdated from './extensions/backend/events/order-updated/order-updated.extension.ts';

import appInstalled from './extensions/backend/events/app-installed/app-installed.extension.ts';

import fileReady from './extensions/backend/events/file-ready/file-ready.extension.ts';


import fileTools from './extensions/backend/app-tools/file-tools/file-tools.extension.ts';

import fileToolsProvider from './extensions/backend/service-plugins/file-tools-provider/file-tools-provider.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

export default app()
  .use(productFiles)
  .use(productFileUpload)
  .use(checkoutFileUpload)
  .use(customerFiles)
  .use(requiredFiles)
  .use(orderCreated)
  .use(orderUpdated)
  .use(appInstalled)
  .use(fileReady)
  .use(fileTools)
  .use(fileToolsProvider).use(dataCollections);
