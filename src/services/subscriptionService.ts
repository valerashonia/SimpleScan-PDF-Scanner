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
    // #region agent log
    fetch('http://127.0.0.1:7297/ingest/f83a1916-bd5c-4fa6-9ecc-295043015f29',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c281dc'},body:JSON.stringify({sessionId:'c281dc',location:'subscriptionService.ts:getPaywall-result',message:'getPaywall returned',data:{placementId:ADAPTY_PLACEMENT_ID,isNull:!paywall,paywallId:(paywall as any)?.id??null,variationId:(paywall as any)?.variationId??null},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (__DEV__) {
      console.log('[Adapty] getPaywall(placement=', ADAPTY_PLACEMENT_ID, ') =>', paywall ? 'paywall' : 'null');
    }
    return paywall;
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7297/ingest/f83a1916-bd5c-4fa6-9ecc-295043015f29',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c281dc'},body:JSON.stringify({sessionId:'c281dc',location:'subscriptionService.ts:getPaywall-error',message:'getPaywall threw',data:{placementId:ADAPTY_PLACEMENT_ID,error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (__DEV__) {
      console.warn('[Adapty] getPaywall failed:', e);
    }
    return null;
  }
}

export async function getPaywallProducts(paywall: AdaptyPaywall): Promise<AdaptyPaywallProduct[]> {
  try {
    const list = await adapty.getPaywallProducts(paywall);
    // #region agent log
    fetch('http://127.0.0.1:7297/ingest/f83a1916-bd5c-4fa6-9ecc-295043015f29',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c281dc'},body:JSON.stringify({sessionId:'c281dc',location:'subscriptionService.ts:getPaywallProducts-result',message:'getPaywallProducts returned',data:{count:list.length,productIds:list.map(p=>p.vendorProductId??'unknown')},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (__DEV__) {
      console.log('[Adapty] getPaywallProducts =>', list.length, 'products');
    }
    return list;
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7297/ingest/f83a1916-bd5c-4fa6-9ecc-295043015f29',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c281dc'},body:JSON.stringify({sessionId:'c281dc',location:'subscriptionService.ts:getPaywallProducts-error',message:'getPaywallProducts threw',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
    const message = getErrorMessage(e, 'Purchase failed.');
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
