// Runtime configuration shared across bundles. Backend extensions (service plugins, events) are
// bundled separately from Astro routes and cannot import `astro:env`, but they run in the same
// isolate behind Astro's request pipeline, so the middleware publishes config on `globalThis`.

export interface RuntimeConfig {
  proPlanPackageNames: string;
  basicMonthlyLimit: number;
}

const KEY = '__productFileUploadConfig';

type ConfigHolder = { [KEY]?: RuntimeConfig };

export function setRuntimeConfig(config: RuntimeConfig): void {
  (globalThis as ConfigHolder)[KEY] = config;
}

export function getRuntimeConfig(): RuntimeConfig | null {
  return (globalThis as ConfigHolder)[KEY] ?? null;
}
