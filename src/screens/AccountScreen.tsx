import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Alert,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';
import { Colors } from '../constants/colors';
import {
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  FEEDBACK_EMAIL,
} from '../constants/legalContent';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const APP_NAME = 'SimpleScan (Document Scanner)';

interface AccountScreenProps {
  onUpgrade?: () => void;
}

export default function AccountScreen({ onUpgrade }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'main' | 'about'>('main');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const openFeedbackMail = async () => {
    const subject = `${APP_NAME} – Feedback`;
    const body = [
      '---',
      `App: ${APP_NAME}`,
      `Version: ${APP_VERSION}`,
      `Platform: ${Platform.OS}`,
      '---',
      '',
      'Your feedback:',
      '',
    ].join('\n');
    try {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        await MailComposer.composeAsync({
          recipients: [FEEDBACK_EMAIL],
          subject,
          body,
        });
      } else {
        const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Error', 'Could not open email. Please check your mail app or try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {view === 'about' && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setView('main')}
          >
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {view === 'main' ? 'Account' : 'About'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === 'main' && (
          <View style={styles.mainContent}>
            <TouchableOpacity
              style={styles.upgradeBannerWrap}
              onPress={() => onUpgrade?.()}
              activeOpacity={1}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBannerGradient}
              >
                <MaterialCommunityIcons name="crown" size={18} color="#F0C45C" />
                <Text style={styles.upgradeBannerText}>Upgrade</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.group}>
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => setShowTermsModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.text} />
                </View>
                <Text style={[styles.itemTitle, styles.itemTitleFlex]}>Terms of use</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => setShowPrivacyModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={Colors.text} />
                </View>
                <Text style={[styles.itemTitle, styles.itemTitleFlex]}>Privacy policy</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemRow}
                onPress={openFeedbackMail}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
                </View>
                <Text style={[styles.itemTitle, styles.itemTitleFlex]}>Feedback</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.itemRow, styles.itemLast]}
                onPress={() => setView('about')}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
                </View>
                <Text style={[styles.itemTitle, styles.itemTitleFlex]}>About</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {view === 'about' && (
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>SimpleScan</Text>
            <Text style={styles.aboutSubtitle}>Document Scanner</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
            <Text style={styles.aboutText}>
              Scan documents with your camera, create multi-page PDFs, crop and organize your scans, and export or share them.
            </Text>
            <Text style={styles.aboutText}>Made with ❤️</Text>
            <Text style={styles.aboutCopyright}>© {new Date().getFullYear()} SimpleScan. All rights reserved.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showTermsModal}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={[styles.termsFullScreen, { paddingTop: insets.top }]}>
          <View style={styles.termsHeader}>
            <TouchableOpacity
              style={styles.termsHeaderButton}
              onPress={() => setShowTermsModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.termsHeaderTitle} numberOfLines={1}>Terms of Use</Text>
            <View style={styles.termsHeaderSpacer} />
          </View>
          <ScrollView
            style={styles.termsScrollView}
            contentContainerStyle={styles.termsScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.termsBody}>{TERMS_CONTENT}</Text>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={[styles.termsFullScreen, { paddingTop: insets.top }]}>
          <View style={styles.termsHeader}>
            <TouchableOpacity
              style={styles.termsHeaderButton}
              onPress={() => setShowPrivacyModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.termsHeaderTitle} numberOfLines={1}>Privacy Policy</Text>
            <View style={styles.termsHeaderSpacer} />
          </View>
          <ScrollView
            style={styles.termsScrollView}
            contentContainerStyle={styles.termsScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.termsBody}>{PRIVACY_CONTENT}</Text>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'left',
    marginLeft: 0,
  },
  scroll: {
    flex: 1,
  },
  mainContent: {},
  upgradeBannerWrap: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  upgradeBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  group: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  itemTitleFlex: {
    flex: 1,
    textAlign: 'left',
  },
  aboutCard: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  aboutSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  aboutVersion: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  aboutCopyright: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  termsFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  termsHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginLeft: 0,
  },
  termsHeaderSpacer: {
    width: 40,
    height: 40,
  },
  termsScrollView: {
    flex: 1,
  },
  termsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  termsBody: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
