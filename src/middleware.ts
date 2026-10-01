import { defineMiddleware } from 'astro:middleware';
import { BASIC_MONTHLY_UPLOAD_LIMIT, PRO_PLAN_PACKAGE_NAMES } from 'astro:env/server';
import { setRuntimeConfig } from './server/runtime-config';

export const onRequest = defineMiddleware((_context, next) => {
  setRuntimeConfig({
    proPlanPackageNames: PRO_PLAN_PACKAGE_NAMES,
    basicMonthlyLimit: BASIC_MONTHLY_UPLOAD_LIMIT,
  });
  return next();
});
