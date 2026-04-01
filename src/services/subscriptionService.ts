import { adapty } from 'react-native-adapty';
import type { AdaptyPaywall, AdaptyPaywallProduct, AdaptyProfile } from 'react-native-adapty';
import { ADAPTY_ACCESS_LEVEL_PRO, ADAPTY_PLACEMENT_ID } from '../constants/subscription';

export type PurchaseResult = { success: boolean; error?: string };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
}

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
    const profile = await adapty.makePurchase(product);
    if (hasPremiumAccess(profile)) {
      return { success: true };
    }
    // Payment charged but access level may not reflect immediately — treat as success
    return { success: true };
  } catch (e: unknown) {
    const message = getErrorMessage(e, 'Purchase failed.');
    const errStr = String(message).toLowerCase();
    if (errStr.includes('cancel') || errStr.includes('user_cancel')) {
      return { success: false, error: 'Purchase was cancelled.' };
    }
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
    const message = getErrorMessage(e, 'Restore failed.');
    return { success: false, error: String(message) };
  }
}
