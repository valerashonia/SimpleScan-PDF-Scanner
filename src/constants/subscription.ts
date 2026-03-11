/**
 * RevenueCat configuration.
 * Get your iOS API key from RevenueCat Dashboard → Project → API keys.
 * Create an entitlement (e.g. "premium") and attach your App Store Connect
 * yearly subscription product with a 3-day free trial.
 */
export const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '';
export const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

/** Entitlement identifier configured in RevenueCat */
export const ENTITLEMENT_PRO = 'pro';
