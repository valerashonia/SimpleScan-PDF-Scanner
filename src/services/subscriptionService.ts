import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID,
  ENTITLEMENT_PRO,
} from '../constants/subscription';

let isInitialized = false;

export function isSubscriptionConfigured(): boolean {
  const key =
    Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  return typeof key === 'string' && key.length > 0;
}

export function initSubscription(): void {
  if (isInitialized) return;
  const apiKey =
    Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return;
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    isInitialized = true;
  } catch (e) {
    if (__DEV__) {
      console.warn('[Subscription] Init failed:', e);
    }
  }
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return typeof customerInfo.entitlements.active[ENTITLEMENT_PRO] !== 'undefined';
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export type PurchaseResult = { success: boolean; error?: string };

/**
 * Purchase a specific package and unlock premium if entitlement "pro" is active.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasPro = hasPremiumEntitlement(customerInfo);
    return hasPro
      ? { success: true }
      : { success: false, error: 'Purchase did not grant premium access.' };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { success: false, error: 'Purchase was cancelled.' };
    }
    const message =
      err?.message ?? (e instanceof Error ? e.message : 'Purchase failed.');
    return { success: false, error: String(message) };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPro = hasPremiumEntitlement(customerInfo);
    return hasPro
      ? { success: true }
      : { success: false, error: 'No active subscription found.' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Restore failed.';
    return { success: false, error: String(message) };
  }
}
