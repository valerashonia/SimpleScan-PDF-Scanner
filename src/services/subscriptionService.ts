import adapty from 'react-native-adapty';
import type { AdaptyPaywall, AdaptyPaywallProduct, AdaptyProfile } from 'react-native-adapty';
import { ADAPTY_PLACEMENT_ID, ADAPTY_ACCESS_LEVEL_PRO } from '../constants/subscription';

export type PurchaseResult = { success: boolean; error?: string };

export function hasPremiumAccess(profile: AdaptyProfile | null): boolean {
  if (!profile?.accessLevels) return false;
  const level = profile.accessLevels[ADAPTY_ACCESS_LEVEL_PRO];
  return Boolean(level?.isActive);
}

export async function getProfile(): Promise<AdaptyProfile | null> {
  try {
    return await adapty.getProfile();
  } catch {
    return null;
  }
}

export async function getPaywall(): Promise<AdaptyPaywall | null> {
  try {
    const paywall = await adapty.getPaywall(ADAPTY_PLACEMENT_ID);
    if (__DEV__) {
      console.log('[Adapty] getPaywall(placement=', ADAPTY_PLACEMENT_ID, ') =>', paywall ? 'paywall' : 'null');
    }
    return paywall;
  } catch (e) {
    if (__DEV__) {
      console.warn('[Adapty] getPaywall failed:', e);
    }
    return null;
  }
}

export async function getPaywallProducts(paywall: AdaptyPaywall): Promise<AdaptyPaywallProduct[]> {
  try {
    const list = await adapty.getPaywallProducts(paywall);
    if (__DEV__) {
      console.log('[Adapty] getPaywallProducts =>', list.length, 'products');
    }
    return list;
  } catch (e) {
    if (__DEV__) {
      console.warn('[Adapty] getPaywallProducts failed:', e);
    }
    return [];
  }
}

export async function makePurchase(product: AdaptyPaywallProduct): Promise<PurchaseResult> {
  try {
    const result = await adapty.makePurchase(product);
    switch (result.type) {
      case 'success':
        return hasPremiumAccess(result.profile ?? null)
          ? { success: true }
          : { success: false, error: 'Purchase did not grant premium access.' };
      case 'user_cancelled':
        return { success: false, error: 'Purchase was cancelled.' };
      case 'pending':
        return { success: false, error: 'Purchase is pending.' };
      default:
        return { success: false, error: 'Purchase failed.' };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Purchase failed.';
    return { success: false, error: String(message) };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const profile = await adapty.restorePurchases();
    return hasPremiumAccess(profile)
      ? { success: true }
      : { success: false, error: 'No active subscription found.' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Restore failed.';
    return { success: false, error: String(message) };
  }
}
