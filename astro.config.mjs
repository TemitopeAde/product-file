// @ts-check
import { defineConfig, envField } from 'astro/config';
import wix from '@wix/astro';
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";

export default defineConfig({
  output: "server",
  adapter: wixHostingAdapter(),
  integrations: [wix(), react()],
  image: { domains: ["static.wixstatic.com"] },
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  vite: { 
    plugins: [tailwindcss()],
    server: {
      cors: true
    }
  },
  env: {
    schema: {
      PRO_PLAN_PACKAGE_NAMES: envField.string({ context: "server", access: "public", default: "" }),
      BASIC_MONTHLY_UPLOAD_LIMIT: envField.number({ context: "server", access: "public", default: 10, int: true, gt: 0 }),
    },
  },
});
