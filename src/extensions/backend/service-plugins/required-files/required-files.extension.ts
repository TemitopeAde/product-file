import { extensions } from '@wix/astro/builders'

export default extensions.ecomValidations({
  id: '2255ea89-50cf-409d-9d6d-7eb1ad68d352',
  name: 'required-files',
  validateInCart: false,
  source: './extensions/backend/service-plugins/required-files/required-files.ts',
});
