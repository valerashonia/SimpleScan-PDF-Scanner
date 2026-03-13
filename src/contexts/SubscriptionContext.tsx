import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdaptyPaywallProduct } from 'react-native-adapty';
import {
  getProfile,
  hasPremiumAccess,
  makePurchase as makePurchaseIAP,
  restorePurchases as restorePurchasesIAP,
} from '../services/subscriptionService';

const STORAGE_KEY_PREMIUM = '@docify_premium';
const STORAGE_KEY_SCAN_DATE = '@docify_scan_date';
const STORAGE_KEY_SCAN_COUNT = '@docify_scan_count';
const DAILY_SCAN_LIMIT_FREE = 1;

function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

interface SubscriptionContextType {
  isPremium: boolean;
  scansUsedToday: number;
  scanLimit: number;
  canScan: () => boolean;
  canExportPdf: () => boolean;
  canUseCloudBackup: () => boolean;
  recordScan: () => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
  showUpgrade: (reason?: string) => void;
  setShowUpgradeCallback: (cb: (() => void) | null) => void;
  purchaseProduct: (product: AdaptyPaywallProduct) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [scansUsedToday, setScansUsedToday] = useState(0);
  const [scanLimit] = useState(DAILY_SCAN_LIMIT_FREE);
  const showUpgradeCallbackRef = useRef<(() => void) | null>(null);
  const scanCountRef = useRef(0);
  const scanDateRef = useRef('');

  const loadState = useCallback(async () => {
    try {
      const [premium, date, count] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_PREMIUM),
        AsyncStorage.getItem(STORAGE_KEY_SCAN_DATE),
        AsyncStorage.getItem(STORAGE_KEY_SCAN_COUNT),
      ]);
      const today = getTodayDateKey();
      const isToday = date === today;
      const used = isToday ? parseInt(count || '0', 10) : 0;
      setIsPremium(premium === 'true');
      setScansUsedToday(used);
      scanCountRef.current = used;
      scanDateRef.current = today;
    } catch (_e) {
      scanDateRef.current = getTodayDateKey();
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile && hasPremiumAccess(profile)) {
        setIsPremium(true);
        await AsyncStorage.setItem(STORAGE_KEY_PREMIUM, 'true');
      }
    })();
  }, []);

  const setPremium = useCallback(async (value: boolean) => {
    setIsPremium(value);
    await AsyncStorage.setItem(STORAGE_KEY_PREMIUM, value ? 'true' : 'false');
  }, []);

  const recordScan = useCallback(async () => {
    if (isPremium) return;
    const today = getTodayDateKey();
    if (scanDateRef.current !== today) {
      scanCountRef.current = 0;
      scanDateRef.current = today;
      await AsyncStorage.setItem(STORAGE_KEY_SCAN_DATE, today);
    }
    scanCountRef.current += 1;
    setScansUsedToday(scanCountRef.current);
    await AsyncStorage.setItem(STORAGE_KEY_SCAN_COUNT, String(scanCountRef.current));
  }, [isPremium]);

  const canScan = useCallback(() => {
    if (isPremium) return true;
    return scansUsedToday < scanLimit;
  }, [isPremium, scansUsedToday, scanLimit]);

  const canExportPdf = useCallback(() => isPremium, [isPremium]);
  const canUseCloudBackup = useCallback(() => isPremium, [isPremium]);

  const showUpgrade = useCallback((_reason?: string) => {
    showUpgradeCallbackRef.current?.();
  }, []);

  const setShowUpgradeCallback = useCallback((cb: (() => void) | null) => {
    showUpgradeCallbackRef.current = cb;
  }, []);

  const purchaseProduct = useCallback(
    async (product: AdaptyPaywallProduct): Promise<PurchaseResult> => {
      const result = await makePurchaseIAP(product);
      if (result.success) {
        await setPremium(true);
      }
      return result;
    },
    [setPremium]
  );

  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    const result = await restorePurchasesIAP();
    if (result.success) {
      await setPremium(true);
    }
    return result;
  }, [setPremium]);

  const value: SubscriptionContextType = {
    isPremium,
    scansUsedToday,
    scanLimit,
    canScan,
    canExportPdf,
    canUseCloudBackup,
    recordScan,
    setPremium,
    showUpgrade,
    setShowUpgradeCallback,
    purchaseProduct,
    restorePurchases,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
