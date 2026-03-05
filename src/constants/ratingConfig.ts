/**
 * In-app rating configuration.
 * Set your Apple App Store numeric ID in app.json extra.ios.appStoreId
 * or EXPO_PUBLIC_APP_STORE_ID (e.g. from App Store Connect → App Information → Apple ID).
 */
import Constants from 'expo-constants';

export const RATING_STORAGE_KEYS = {
  VISIT_COUNT: '@simplescan_rating_visits',
  DISMISSED: '@simplescan_rating_dismissed',
  COMPLETED: '@simplescan_rating_completed',
  REMIND_AFTER_VISITS: '@simplescan_rating_remind_after_visits',
} as const;

export const VISIT_THRESHOLD = 4;
export const REMIND_LATER_VISITS_DELTA = 3;

const extra = (Constants.expoConfig?.extra as { ios?: { appStoreId?: string } }) ?? {};
export const APP_STORE_APP_ID =
  extra.ios?.appStoreId || process.env.EXPO_PUBLIC_APP_STORE_ID || '';

export const getAppStoreReviewUrl = (): string => {
  if (APP_STORE_APP_ID) {
    return `https://apps.apple.com/app/id${APP_STORE_APP_ID}?action=write-review`;
  }
  return '';
};
