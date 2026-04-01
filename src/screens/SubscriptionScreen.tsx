import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AdaptyPaywallProduct } from 'react-native-adapty';
import { Colors } from '../constants/colors';
import { ADAPTY_PLACEMENT_ID } from '../constants/subscription';
import { TERMS_CONTENT, PRIVACY_CONTENT } from '../constants/legalContent';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPaywall, getPaywallProducts } from '../services/subscriptionService';

const PADDING_H = 24;
const SCREEN_BG_TOP = '#F0F7FF';
const SCREEN_BG_BOTTOM = '#FFFFFF';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E5E7EB';
const CARD_SELECTED_BORDER = '#9359FF';
const CTA_BG = '#9359FF';
const TEXT_DARK = '#111827';
const TEXT_CAPTION = '#6B7280';

const FEATURES = [
  { icon: 'document-text' as const, label: 'Document Scan', caption: 'Scan any document instantly with your camera.', color: '#22C55E' },
  { icon: 'documents' as const, label: 'Multi-page PDF', caption: 'Build and export multi-page PDFs in one place.', color: '#EAB308' },
  { icon: 'share-social' as const, label: 'Share & Organize', caption: 'Export and share your PDFs anytime.', color: '#3B82F6' },
];

function isYearlyProduct(product: AdaptyPaywallProduct): boolean {
  const id = (product.vendorProductId ?? '').toLowerCase();
  return id.includes('yearly') || id.includes('annual');
}

function getProductLabel(product: AdaptyPaywallProduct): string {
  return isYearlyProduct(product) ? 'Annually' : 'Weekly';
}

function getProductPriceString(product: AdaptyPaywallProduct): string {
  return product.price?.localizedString ?? '—';
}

function getCtaLabel(product: AdaptyPaywallProduct | null): string {
  if (!product) return 'Continue';
  return isYearlyProduct(product) ? 'Start Free Trial' : 'Continue';
}

interface SubscriptionScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function SubscriptionScreen({ onComplete, onSkip }: SubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const { purchaseProduct, restorePurchases } = useSubscription();

  const [products, setProducts] = useState<AdaptyPaywallProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AdaptyPaywallProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const paywall = await getPaywall();
      if (!paywall) {
        if (__DEV__) {
          console.warn(
            `[SubscriptionScreen] Paywall is null for placement "${ADAPTY_PLACEMENT_ID}".`
          );
        }
        setProductsError(`Paywall not found for placement "${ADAPTY_PLACEMENT_ID}". Verify Adapty Dashboard has a published paywall.`);
        setProducts([]);
        setSelectedProduct(null);
        return;
      }
      const list = await getPaywallProducts(paywall);
      if (list.length === 0) {
        setProductsError('Paywall loaded but no products found. Check Adapty Dashboard products and App Store Connect IAP status.');
        setProducts([]);
        setSelectedProduct(null);
        return;
      }
      setProducts(list);
      setSelectedProduct(list[0] ?? null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load plans.';
      setProductsError(message);
      setProducts([]);
      setSelectedProduct(null);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handlePurchase = async () => {
    if (!selectedProduct) {
      Alert.alert('Select a Plan', 'Please select a subscription plan first.', [{ text: 'OK' }]);
      return;
    }
    setIsPurchasing(true);
    try {
      const result = await purchaseProduct(selectedProduct);
      if (result.success) {
        onComplete();
        return;
      }
      Alert.alert('Purchase Failed', result.error ?? 'Something went wrong. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        onComplete();
        return;
      }
      Alert.alert('Restore Purchases', result.error ?? 'No active subscription found for this Apple ID.', [{ text: 'OK' }]);
    } finally {
      setIsRestoring(false);
    }
  };

  const isLoading = isPurchasing || isRestoring;
  const hasProducts = products.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[SCREEN_BG_TOP, SCREEN_BG_BOTTOM]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.restoreTopButton}
            onPress={handleRestore}
            disabled={isLoading}
          >
            <Text style={[styles.restoreTopText, isLoading && { opacity: 0.5 }]}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onSkip ?? onComplete}
          >
            <Ionicons name="close" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainLayout}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          >
            <Text style={styles.title}>Unlock SimpleScan Pro.</Text>
            <Text style={styles.subtitle}>Unlock unlimited scans and PDF export</Text>

            <View style={styles.featuresList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: f.color + '22' }]}>
                    <Ionicons name={f.icon} size={22} color={f.color} />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <Text style={styles.featureCaption}>{f.caption}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.cardsBlockWrap}>
              {loadingProducts ? (
                <View style={styles.loadingOfferings}>
                  <ActivityIndicator size="large" color={CARD_SELECTED_BORDER} />
                  <Text style={styles.loadingOfferingsText}>Loading plans...</Text>
                </View>
              ) : productsError ? (
                <View style={styles.offeringsError}>
                  <Text style={styles.offeringsErrorText}>{productsError}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : hasProducts ? (
                <View style={styles.planCardsRow}>
                  {products.map((product) => {
                    const selected = selectedProduct?.vendorProductId === product.vendorProductId;
                    const yearly = isYearlyProduct(product);
                    return (
                      <View key={product.vendorProductId} style={styles.planCardColumn}>
                        <Pressable
                          style={[styles.planCard, selected && styles.planCardSelected]}
                          onPress={() => setSelectedProduct(product)}
                        >
                          {selected && (
                            <View style={styles.planCardCheck}>
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                          )}
                          <Text style={styles.planCardTitle} numberOfLines={1}>
                            {getProductLabel(product)}
                          </Text>
                          <Text style={styles.planCardPrice}>
                            {getProductPriceString(product)}
                          </Text>
                          {yearly ? (
                            <Text style={styles.planCardTrial}>3-day free trial</Text>
                          ) : (
                            <Text style={styles.planCardBilledLabel}>Billed Weekly</Text>
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.fixedBottomSection}>
            <TouchableOpacity
              style={[styles.ctaButton, (isLoading || !selectedProduct) && styles.ctaButtonDisabled]}
              onPress={handlePurchase}
              activeOpacity={0.9}
              disabled={isLoading || !selectedProduct}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.ctaText}>{getCtaLabel(selectedProduct)}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.cancelAnytimeText}>Cancel anytime. Billed via your App Store account.</Text>
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={showTermsModal} animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
        <View style={[styles.legalFullScreen, { paddingTop: insets.top }]}>
          <View style={styles.legalHeader}>
            <TouchableOpacity style={styles.legalHeaderButton} onPress={() => setShowTermsModal(false)}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.legalHeaderTitle}>Terms of Use</Text>
            <View style={styles.legalHeaderSpacer} />
          </View>
          <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legalScrollContent} showsVerticalScrollIndicator>
            <Text style={styles.legalBody}>{TERMS_CONTENT}</Text>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPrivacyModal} animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={[styles.legalFullScreen, { paddingTop: insets.top }]}>
          <View style={styles.legalHeader}>
            <TouchableOpacity style={styles.legalHeaderButton} onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.legalHeaderTitle}>Privacy Policy</Text>
            <View style={styles.legalHeaderSpacer} />
          </View>
          <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legalScrollContent} showsVerticalScrollIndicator>
            <Text style={styles.legalBody}>{PRIVACY_CONTENT}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: PADDING_H,
    right: PADDING_H,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restoreTopButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  restoreTopText: {
    fontSize: 14,
    fontWeight: '600',
    color: CARD_SELECTED_BORDER,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainLayout: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PADDING_H,
    paddingTop: 56,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsBlockWrap: {
    width: '100%',
    marginTop: 0,
    paddingTop: 0,
  },
  loadingOfferings: {
    width: '100%',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingOfferingsText: {
    fontSize: 15,
    color: TEXT_CAPTION,
  },
  offeringsError: {
    width: '100%',
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  offeringsErrorText: {
    fontSize: 15,
    color: TEXT_CAPTION,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: CTA_BG,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fixedBottomSection: {
    paddingHorizontal: PADDING_H,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD_BORDER,
    backgroundColor: SCREEN_BG_BOTTOM,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_CAPTION,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 28,
    gap: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  featureCaption: {
    fontSize: 14,
    color: TEXT_CAPTION,
    lineHeight: 20,
  },
  planBadgeFullWidth: {
    width: '100%',
    minHeight: 0,
  },
  planBadgeAbove: {
    width: '100%',
  },
  planCardsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 16,
    marginBottom: 28,
  },
  planCardColumn: {
    flex: 1,
    minWidth: 140,
  },
  planCard: {
    width: '100%',
    flex: 1,
    minHeight: 120,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: CARD_BORDER,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: CARD_SELECTED_BORDER,
  },
  planCardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: CARD_SELECTED_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardBadgeText: {
    fontSize: 13,
    color: TEXT_CAPTION,
    textAlign: 'center',
    lineHeight: 18,
  },
  planCardTrial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
    marginTop: 4,
  },
  planCardBilledLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A0A0A0',
    marginTop: 4,
  },
  planCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 6,
    textAlign: 'center',
  },
  planCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  planCardPriceSuffix: {
    fontSize: 14,
    fontWeight: '400',
    color: TEXT_CAPTION,
  },
  planCardBenefit: {
    fontSize: 12,
    color: TEXT_CAPTION,
  },
  planCardBenefitCenter: {
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: CTA_BG,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelAnytimeText: {
    fontSize: 13,
    color: TEXT_CAPTION,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    color: TEXT_CAPTION,
  },
  footerDot: {
    fontSize: 13,
    color: TEXT_CAPTION,
    opacity: 0.6,
  },
  legalFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 24,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  legalHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  legalHeaderSpacer: { width: 40, height: 40 },
  legalScroll: { flex: 1 },
  legalScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  legalBody: { fontSize: 15, lineHeight: 24, color: Colors.textSecondary },
});
