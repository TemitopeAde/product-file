export type ViewId = 'overview' | 'products' | 'uploads' | 'orders' | 'billing' | 'settings' | 'help';

export type Navigate = (view: ViewId, params?: Record<string, string>) => void;
