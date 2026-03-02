import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const LIGHT_BG = '#F1F5FC';
const ACCENT_PURPLE = '#8B5CF6';

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Scan in Seconds.',
    description: 'Use your camera to turn documents into\nclean PDFs instantly.',
  },
  {
    id: '2',
    title: 'Import & Convert.',
    description: 'Select images from your gallery and\nconvert them to PDF.',
  },
  {
    id: '3',
    title: 'Save & Organize.',
    description: 'All your scans are securely saved\nin one place.',
  },
];

const ILLUSTRATION_HEIGHT = height * 0.40;

interface OnboardingScreenProps {
  onComplete: () => void;
  onSubscribe: () => void;
}

const ILLUSTRATION_IMAGES = [
  require('../../assets/onboarding-screen-1.png'),
  require('../../assets/onboarding-screen-2.png'),
  require('../../assets/onboarding-screen-3.png'),
];

function OnboardingIllustration({ slideIndex }: { slideIndex: number }) {
  const source = ILLUSTRATION_IMAGES[slideIndex] ?? ILLUSTRATION_IMAGES[0];
  const isFullBleedSlide = slideIndex === 0 || slideIndex === 1 || slideIndex === 2;
  return (
    <View style={[styles.illustrationWrapper, isFullBleedSlide && styles.illustrationWrapperFirst]}>
      <Image
        source={source}
        style={[styles.illustrationImage, isFullBleedSlide && styles.illustrationImageFirst]}
        resizeMode={isFullBleedSlide ? 'contain' : 'cover'}
      />
    </View>
  );
}

const IllustrationWithGradient = OnboardingIllustration;

export default function OnboardingScreen({ onComplete, onSubscribe }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next });
      setCurrentIndex(next);
    } else {
      onSubscribe();
    }
  };

  const renderItem = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={styles.slide}>
      <OnboardingIllustration slideIndex={index} />
      <View style={styles.contentBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        style={styles.flatList}
      />

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: LIGHT_BG,
  },
  illustrationWrapper: {
    width: width,
    height: ILLUSTRATION_HEIGHT,
    marginTop: height * 0.12,
    overflow: 'hidden',
    backgroundColor: LIGHT_BG,
  },
  illustrationWrapperFirst: {
    marginTop: 0,
    height: height * 0.55,
    alignSelf: 'flex-start',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  illustrationImageFirst: {
    width: width,
    height: height * 0.55,
    opacity: 1,
  },
  contentBlock: {
    paddingTop: height * 0.14,
    paddingBottom: 24,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 34,
    marginBottom: 14,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
    backgroundColor: LIGHT_BG,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: ACCENT_PURPLE,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
