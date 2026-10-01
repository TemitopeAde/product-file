import { extensions } from '@wix/astro/builders'

import appSettingsCollection from './app-settings';

import productRulesCollection from './product-rules';

import uploadsCollection from './uploads';

import quotaSlotsCollection from './quota-slots';

import ordersCollection from './orders';

import validationObservationsCollection from './validation-observations';

export default extensions.dataCollections({
  id: '0e47e065-beb4-47fd-b14a-477ad2cb772b',
  name: 'Data Collections',
  collections: [
    appSettingsCollection,
    productRulesCollection,
    uploadsCollection,
    quotaSlotsCollection,
    ordersCollection,
    validationObservationsCollection
  ],
});
