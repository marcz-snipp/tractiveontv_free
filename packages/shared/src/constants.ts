export const TRACTIVE_BASE_URL = 'https://graph.tractive.com';
export const TRACTIVE_CHANNEL_URL = 'https://channel.tractive.com';
export const TRACTIVE_APS_URL = 'https://aps-api.tractive.com';

export const TRACTIVE_CLIENT_ID = '5728aa1fc9077f7c32000186';

export const TRACTIVE_HEADER_USER = 'X-Tractive-User';
export const TRACTIVE_HEADER_CLIENT = 'X-Tractive-Client';

export const POLL_INTERVAL_STANDARD_MS = 45_000;
export const POLL_INTERVAL_LIVE_MS = 15_000;
export const POLL_BACKOFF_MAX_MS = 5 * 60_000;
export const LIVE_MAX_DURATION_MS = 3 * 60_000;
export const LIVE_COMMAND_RECHECK_MS = 30_000;

export const OFFLINE_THRESHOLD_MS = 10 * 60_000;
export const LOW_BATTERY_THRESHOLD = 20;

export const SUPPORTED_LOCALES = ['fr-FR', 'en-US', 'es-ES', 'it-IT', 'de-DE'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'fr-FR';
