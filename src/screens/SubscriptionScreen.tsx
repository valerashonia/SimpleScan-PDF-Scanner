import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { TERMS_CONTENT, PRIVACY_CONTENT } from '../constants/legalContent';

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

type PlanId = 'free_trial' | 'yearly';

interface SubscriptionScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function SubscriptionScreen({ onComplete, onSkip }: SubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free_trial');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'If you purchased premium on this Apple ID, restore will be available when in-app purchase is enabled.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[SCREEN_BG_TOP, SCREEN_BG_BOTTOM]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 8 }]}
          onPress={onSkip ?? onComplete}
        >
          <Ionicons name="close" size={24} color={TEXT_DARK} />
        </TouchableOpacity>

        <View style={styles.mainLayout}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
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
              <View style={styles.planBadgeFullWidth}>
                {selectedPlan === 'yearly' && (
                  <View style={styles.planBadgeAbove}>
                    <Text style={styles.planCardBadgeText}>Billed annually. Cancel anytime.</Text>
                  </View>
                )}
                {selectedPlan === 'free_trial' && (
                  <View style={styles.planBadgeAbove}>
                    <Text style={styles.planCardBadgeText}>Only $1.50 per month after trial. Cancel anytime before trial ends.</Text>
                  </View>
                )}
              </View>
              <View style={styles.planCardsRow}>
              <View style={styles.planCardColumn}>
                <Pressable
                  style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  {selectedPlan === 'yearly' && (
                    <View style={styles.planCardCheck}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <Ionicons name="calendar-outline" size={24} color={TEXT_CAPTION} style={styles.planCardIcon} />
                  <Text style={styles.planCardPrice}>
                    $18 <Text style={styles.planCardPriceSuffix}>/year</Text>
                  </Text>
                  <Text style={[styles.planCardBenefit, styles.planCardBenefitCenter]}>Only $1.50 per month</Text>
                </Pressable>
              </View>
              <View style={styles.planCardColumn}>
                <Pressable
                  style={[styles.planCard, selectedPlan === 'free_trial' && styles.planCardSelected]}
                  onPress={() => setSelectedPlan('free_trial')}
                >
                  {selectedPlan === 'free_trial' && (
                    <View style={styles.planCardCheck}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <Ionicons name="flash-outline" size={24} color={TEXT_CAPTION} style={styles.planCardIcon} />
                  <Text style={[styles.planCardName, styles.planCardTextCenter, { marginBottom: 8 }]}>3 Days Free</Text>
                  <Text style={[styles.planCardBenefit, styles.planCardBenefitCenter]}>Then $18 / year</Text>
                </Pressable>
              </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.fixedBottomSection}>
            <TouchableOpacity style={styles.ctaButton} onPress={onComplete} activeOpacity={0.9}>
              <Text style={styles.ctaText}>Try Free for 3 Days</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.footerLink}>Restore</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
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
  closeButton: {
    position: 'absolute',
    right: PADDING_H,
    zIndex: 10,
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
    paddingTop: 48,
    paddingBottom: 32,
  },
  cardsBlockWrap: {
    marginTop: -32,
    paddingTop: 28,
  },
  fixedBottomSection: {
    marginTop: 'auto',
    paddingHorizontal: PADDING_H,
    paddingTop: 20,
    paddingBottom: 20,
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
    marginBottom: 32,
  },
  featuresList: {
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
    minHeight: 52,
    marginBottom: 16,
    justifyContent: 'center',
  },
  planBadgeAbove: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(147, 89, 255, 0.12)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  planCardColumn: {
    flex: 1,
    minWidth: 0,
  },
  planCard: {
    width: '100%',
    height: 160,
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
  planCardIcon: {
    marginBottom: 12,
  },
  planCardNameWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  planCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  planCardTextCenter: {
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
    marginBottom: 20,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
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
