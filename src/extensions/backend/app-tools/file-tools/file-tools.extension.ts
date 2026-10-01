import { extensions } from '@wix/astro/builders'

export default extensions.appTools({
  id: '257b0afa-be70-4ae7-87e8-3bc16c088c39',
  name: 'file-tools',
  tools: [
    {
      methodName: 'get-upload-usage',
      displayName: 'Get File Upload Usage',
      description:
        'Returns the Product File Upload plan for this site (Basic, Pro trial, Pro) and how many customer file uploads were used this month, the monthly limit, and how many remain. Use when the merchant asks about upload limits, quota, remaining uploads, or their Product File Upload plan.',
      activated: true,
      requestSchema: { type: 'object', properties: {} },
      responseSchema: {
        type: 'object',
        properties: {
          tier: { type: 'string' },
          used: { type: 'number' },
          limit: { type: ['number', 'null'] },
          remaining: { type: ['number', 'null'] },
          periodEnd: { type: ['string', 'null'] },
        },
      },
    },
    {
      methodName: 'list-recent-uploads',
      displayName: 'List Recent Customer Files',
      description:
        'Lists the most recent files customers uploaded for products, with file name, product, status, and the order number when the file is attached to an order. Use when the merchant asks which files customers uploaded, what came in recently, or whether uploads failed. Optional status filter: READY, PROCESSING, FAILED. Optional limit up to 20.',
      activated: true,
      requestSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['READY', 'PROCESSING', 'FAILED'] },
          limit: { type: 'number', minimum: 1, maximum: 20 },
        },
      },
      responseSchema: { type: 'object', properties: { uploads: { type: 'array', items: { type: 'object' } } } },
    },
    {
      methodName: 'get-order-files',
      displayName: 'Get Files for an Order',
      description:
        'Returns the customer files attached to a specific store order, looked up by order number, including each file name, product, and whether it was linked to its line item. Use when the merchant asks for the files, artwork, or documents a customer sent with an order. Requires the order number.',
      activated: true,
      requestSchema: {
        type: 'object',
        properties: { orderNumber: { type: 'string', description: 'The store order number, for example 10023.' } },
        required: ['orderNumber'],
      },
      responseSchema: { type: 'object', properties: { found: { type: 'boolean' }, files: { type: 'array', items: { type: 'object' } } } },
    },
    {
      methodName: 'list-upload-products',
      displayName: 'List Products Accepting Files',
      description:
        'Lists the store products where customer file uploads are turned on, whether a file is required before checkout, accepted file types, maximum size, and maximum number of files. Use when the merchant asks which products collect files or what the upload settings are.',
      activated: true,
      requestSchema: { type: 'object', properties: {} },
      responseSchema: { type: 'object', properties: { products: { type: 'array', items: { type: 'object' } } } },
    },
  ],
});
