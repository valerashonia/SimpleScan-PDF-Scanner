import { adapty } from 'react-native-adapty';
import type { AdaptyPaywall, AdaptyPaywallProduct, AdaptyProfile } from 'react-native-adapty';
import { ADAPTY_ACCESS_LEVEL_PRO } from '../constants/subscription';

export type PurchaseResult = { success: boolean; error?: string };

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7297/ingest/f83a1916-bd5c-4fa6-9ecc-295043015f29', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e9260a' },
    body: JSON.stringify({
      sessionId: 'e9260a',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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
  debugLog('H2', 'subscriptionService.ts:getPaywall:entry', 'Calling adapty.getPaywall', {
    placementId: 'main',
  });
  try {
    const paywall = await adapty.getPaywall('main');
    debugLog('H2', 'subscriptionService.ts:getPaywall:success', 'adapty.getPaywall success', {
      isNull: !paywall,
      hasRemoteConfig: Boolean((paywall as { remoteConfig?: unknown })?.remoteConfig),
      variationId: (paywall as { variationId?: string })?.variationId ?? null,
    });
    if (__DEV__) {
      console.log('[Adapty] getPaywall(placement= main ) =>', paywall ? 'paywall' : 'null');
    }
    return paywall;
  } catch (e) {
    debugLog('H2', 'subscriptionService.ts:getPaywall:error', 'adapty.getPaywall failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    if (__DEV__) {
      console.warn('[Adapty] getPaywall failed:', e);
    }
    return null;
  }
}

export async function getPaywallProducts(paywall: AdaptyPaywall): Promise<AdaptyPaywallProduct[]> {
  debugLog('H3', 'subscriptionService.ts:getPaywallProducts:entry', 'Calling adapty.getPaywallProducts', {
    placementId: (paywall as { placementId?: string })?.placementId ?? 'unknown',
  });
  try {
    const list = await adapty.getPaywallProducts(paywall);
    debugLog('H3', 'subscriptionService.ts:getPaywallProducts:success', 'adapty.getPaywallProducts success', {
      count: list.length,
      productIds: list.map((p) => p.vendorProductId ?? 'unknown'),
    });
    if (__DEV__) {
      console.log('[Adapty] getPaywallProducts =>', list.length, 'products');
    }
    return list;
  } catch (e) {
    debugLog('H3', 'subscriptionService.ts:getPaywallProducts:error', 'adapty.getPaywallProducts failed', {
      error: e instanceof Error ? e.message : String(e),
    });
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
