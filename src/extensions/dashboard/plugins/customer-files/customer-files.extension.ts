import { extensions } from '@wix/astro/builders'

export default extensions.dashboardPlugin({
  id: '57374e1b-8cd4-4037-b69b-c5adecc2d5b2',
  title: 'Customer Files',
  extends: 'cb16162e-42aa-41bd-a644-dc570328c6cc',
  component: './extensions/dashboard/plugins/customer-files/customer-files.tsx',
});
