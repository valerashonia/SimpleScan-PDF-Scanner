/**
 * Adapty configuration.
 * Set EXPO_PUBLIC_ADAPTY_PUBLIC_SDK_KEY in .env (from Adapty Dashboard → App settings → General).
 * Create a placement and paywall in the Adapty Dashboard and use the placement id below.
 */
/** Placement id for the subscription paywall (configure in Adapty Dashboard) */
export const ADAPTY_PLACEMENT_ID = process.env.EXPO_PUBLIC_ADAPTY_PLACEMENT_ID ?? 'main';

/** Access level id that grants premium (configure in Adapty Dashboard) */
export const ADAPTY_ACCESS_LEVEL_PRO = 'premium';
