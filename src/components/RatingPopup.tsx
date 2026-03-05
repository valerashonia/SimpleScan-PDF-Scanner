import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const STAR_COUNT = 5;

interface RatingPopupProps {
  visible: boolean;
  onRateNow: (stars: number) => void;
  onRemindLater: () => void;
  onNoThanks: () => void;
}

export default function RatingPopup({
  visible,
  onRateNow,
  onRemindLater,
  onNoThanks,
}: RatingPopupProps) {
  const [selectedStars, setSelectedStars] = useState(0);

  const handleRateNow = () => {
    onRateNow(selectedStars > 0 ? selectedStars : 5);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNoThanks}
    >
      <Pressable style={styles.backdrop} onPress={onNoThanks}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Enjoying SimpleScan?</Text>
          <Text style={styles.subtitle}>
            Your feedback helps us improve. Tap to rate:
          </Text>
          <View style={styles.starsRow}>
            {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelectedStars(star)}
                style={styles.starTouch}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={star <= selectedStars ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= selectedStars ? '#F0C45C' : Colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleRateNow}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonPrimaryText}>Rate Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onRemindLater}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonSecondaryText}>Remind Me Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonTertiary]}
              onPress={onNoThanks}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonTertiaryText}>No Thanks</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  starTouch: {
    padding: 4,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#9359FF',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(147, 89, 255, 0.12)',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9359FF',
  },
  buttonTertiary: {
    backgroundColor: 'transparent',
  },
  buttonTertiaryText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
