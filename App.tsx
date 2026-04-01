import React, { useState, useEffect } from 'react';
import { adapty } from 'react-native-adapty';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import { SubscriptionProvider, useSubscription } from './src/contexts/SubscriptionContext';

type AppState = 'splash' | 'onboarding' | 'subscription' | 'main';

function RegisterUpgradeCallback({ setAppState }: { setAppState: (s: AppState) => void }) {
  const { setShowUpgradeCallback } = useSubscription();
  useEffect(() => {
    setShowUpgradeCallback(() => setAppState('subscription'));
    return () => setShowUpgradeCallback(null);
  }, [setShowUpgradeCallback, setAppState]);
  return null;
}

function AppContent() {
  const [appState, setAppState] = useState<AppState>('splash');
  const { setPremium } = useSubscription();

  // Adapty: runs once on cold start. Requires a dev/production native build (EAS or expo run:ios), not Expo Go.
  useEffect(() => {
    const initAdapty = async () => {
      const envKey = process.env.EXPO_PUBLIC_ADAPTY_PUBLIC_SDK_KEY;
      const adaptyKey = (
        envKey ??
        'public_live_5PWYUHOF.kohd4hNevLuLZpN6UFQa'
      ).trim();
      const keySource = envKey ? 'env' : 'fallback';

      if (__DEV__) {
        console.log(
          '[Adapty] Module check — activate is function:',
          typeof adapty?.activate === 'function',
        );
        console.log('[Adapty] Init: public key configured=', !!adaptyKey, 'length=', adaptyKey.length);
      }

      if (!adaptyKey) {
        console.warn('[Adapty] Skipping activation: EXPO_PUBLIC_ADAPTY_PUBLIC_SDK_KEY is empty.');
        return;
      }

      try {
        await adapty.activate(adaptyKey, {
          __ignoreActivationOnFastRefresh: __DEV__,
        });
        // Visible in Xcode / TestFlight device logs — confirms native module + activation for production review
        console.log('[Adapty] SDK activated successfully.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[Adapty] activate() failed:', msg, e);
      }
    };

    initAdapty();
  }, []);

  const handleSplashComplete = async () => {
    try {
      const value = await AsyncStorage.getItem('@docify_onboarding_done');
      const hasCompletedOnboarding = value === 'true';
      if (hasCompletedOnboarding) {
        setAppState('main');
      } else {
        setAppState('onboarding');
      }
    } catch (_error) {
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setAppState('main');
  };

  const handleShowSubscription = () => {
    setAppState('subscription');
  };

  const handleSubscriptionComplete = async () => {
    try {
      await setPremium(true);
      await AsyncStorage.setItem('@docify_onboarding_done', 'true');
    } catch (_error) {}
    setAppState('main');
  };

  const handleSubscriptionSkip = () => {
    setAppState('main');
  };

  const handleUpgradeFromMain = () => {
    setAppState('subscription');
  };

  if (appState === 'splash') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen onComplete={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }

  if (appState === 'onboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          onSubscribe={handleShowSubscription}
        />
      </SafeAreaProvider>
    );
  }

  if (appState === 'subscription') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SubscriptionScreen
          onComplete={handleSubscriptionComplete}
          onSkip={handleSubscriptionSkip}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RegisterUpgradeCallback setAppState={setAppState} />
        <TabNavigator onUpgrade={handleUpgradeFromMain} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <SubscriptionProvider>
      <AppContent />
    </SubscriptionProvider>
  );
}
