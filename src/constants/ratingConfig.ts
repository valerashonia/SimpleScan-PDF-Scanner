/**
 * In-app rating configuration.
 * Set your Apple App Store numeric ID in app.json extra.ios.appStoreId
 * or EXPO_PUBLIC_APP_STORE_ID (e.g. from App Store Connect → App Information → Apple ID).
 */
import Constants from 'expo-constants';

export const RATING_STORAGE_KEYS = {
  VISIT_COUNT: '@simplescan_rating_visits',
  /** Set after requesting native StoreKit review so we don't prompt too frequently. */
  NATIVE_REQUESTED: '@simplescan_rating_native_requested',
} as const;

/** Show native rating prompt after this many Home screen visits (Apple: don't prompt too often). */
export const VISIT_THRESHOLD = 4;

const extra = (Constants.expoConfig?.extra as { ios?: { appStoreId?: string } }) ?? {};
export const APP_STORE_APP_ID =
  extra.ios?.appStoreId || process.env.EXPO_PUBLIC_APP_STORE_ID || '';

export const getAppStoreReviewUrl = (): string => {
  if (APP_STORE_APP_ID) {
    return `https://apps.apple.com/app/id${APP_STORE_APP_ID}?action=write-review`;
  }
  return '';
};
