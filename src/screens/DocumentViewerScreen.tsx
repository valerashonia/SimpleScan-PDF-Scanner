import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  Animated,
  TextInput,
  StatusBar,
  PanResponder,
  PanResponderGestureState,
  ScrollView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useSubscription } from '../contexts/SubscriptionContext';
import * as ImageManipulator from 'expo-image-manipulator';
import { shareDocumentAsPdf } from '../services/pdfService';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Document {
  id: string;
  title: string;
  date: string;
  pages: number;
  type: 'pdf' | 'png' | 'image';
  icon?: string;
  uri?: string;
  imageUri?: string;
  pageImages?: string[];
}

interface DocumentViewerScreenProps {
  document: Document;
  onClose: () => void;
  onShare?: (doc: any) => void | Promise<void>;
  onDelete?: (doc: any) => void;
  onRename?: (docId: string, newTitle: string) => void;
  onUpgrade?: () => void;
  onAddPage?: () => void;
  onUpdateDocumentPages?: (docId: string, pageImages: string[]) => void;
}

type ExportFormat = 'pdf' | 'png';

export default function DocumentViewerScreen({
  document,
  onClose,
  onShare,
  onDelete,
  onRename,
  onUpgrade,
  onAddPage,
  onUpdateDocumentPages,
}: DocumentViewerScreenProps) {
  const { canExportPdf, showUpgrade } = useSubscription();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    document.type === 'pdf' ? 'pdf' : document.type === 'png' ? 'png' : 'pdf'
  );
  const [newDocName, setNewDocName] = useState(
    document.title.replace(/\.(pdf|jpg|jpeg|png)$/i, '')
  );
  const [isCropping, setIsCropping] = useState(false);
  const [pages, setPages] = useState<string[]>(() => {
    const base = document.pageImages && document.pageImages.length > 0
      ? [...document.pageImages]
      : document.imageUri ? [document.imageUri] : [];
    return base;
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const next = document.pageImages && document.pageImages.length > 0
      ? [...document.pageImages]
      : document.imageUri ? [document.imageUri] : [];
    setPages(next);
    setCurrentPageIndex(0);
  }, [document]);
  const [cropArea, setCropArea] = useState({
    x: 40,
    y: 80,
    width: width - 80,
    height: 300,
  });
  const [cropPageIndex, setCropPageIndex] = useState(0);
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const lastCropArea = useRef(cropArea);
  const gestureStartCropArea = useRef(cropArea);
  lastCropArea.current = cropArea;

  const defaultCropArea = { x: 40, y: 80, width: width - 80, height: 300 };

  const handleCornerDrag = (corner: string, gestureState: PanResponderGestureState) => {
    const { dx, dy } = gestureState;
    const minSize = 50;
    const maxX = width - minSize;
    const maxY = SCREEN_HEIGHT * 0.6;
    const base = gestureStartCropArea.current;
    let newArea = { ...base };

    switch (corner) {
      case 'TL':
        newArea.x = Math.max(0, Math.min(base.x + dx, base.x + base.width - minSize));
        newArea.y = Math.max(0, Math.min(base.y + dy, base.y + base.height - minSize));
        newArea.width = base.width - (newArea.x - base.x);
        newArea.height = base.height - (newArea.y - base.y);
        break;
      case 'TR':
        newArea.width = Math.max(minSize, Math.min(base.width + dx, maxX - base.x));
        newArea.y = Math.max(0, Math.min(base.y + dy, base.y + base.height - minSize));
        newArea.height = base.height - (newArea.y - base.y);
        break;
      case 'BL':
        newArea.x = Math.max(0, Math.min(base.x + dx, base.x + base.width - minSize));
        newArea.width = base.width - (newArea.x - base.x);
        newArea.height = Math.max(minSize, Math.min(base.height + dy, maxY - base.y));
        break;
      case 'BR':
        newArea.width = Math.max(minSize, Math.min(base.width + dx, maxX - base.x));
        newArea.height = Math.max(minSize, Math.min(base.height + dy, maxY - base.y));
        break;
    }
    setCropArea(newArea);
    lastCropArea.current = newArea;
  };

  const createCornerPanResponder = (corner: string) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gestureStartCropArea.current = { ...lastCropArea.current };
      setActiveCorner(corner);
    },
    onPanResponderMove: (_, gestureState) => handleCornerDrag(corner, gestureState),
    onPanResponderRelease: () => setActiveCorner(null),
  });

  const handleFrameDrag = (gestureState: PanResponderGestureState) => {
    const { dx, dy } = gestureState;
    const base = gestureStartCropArea.current;
    
    let newX = base.x + dx;
    let newY = base.y + dy;
    
    // Clamp to screen bounds
    newX = Math.max(0, Math.min(newX, width - base.width));
    newY = Math.max(0, Math.min(newY, SCREEN_HEIGHT * 0.6 - base.height));
    
    const newArea = { ...base, x: newX, y: newY };
    setCropArea(newArea);
    lastCropArea.current = newArea;
  };

  const framePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gestureStartCropArea.current = { ...lastCropArea.current };
      setActiveCorner('FRAME');
    },
    onPanResponderMove: (_, gestureState) => handleFrameDrag(gestureState),
    onPanResponderRelease: () => setActiveCorner(null),
  })).current;

  const tlPanResponder = useRef(createCornerPanResponder('TL')).current;
  const trPanResponder = useRef(createCornerPanResponder('TR')).current;
  const blPanResponder = useRef(createCornerPanResponder('BL')).current;
  const brPanResponder = useRef(createCornerPanResponder('BR')).current;

  // Animation for bottom sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const formats: { key: ExportFormat; label: string; icon: string }[] = [
    { key: 'pdf', label: 'PDF', icon: 'document-text' },
    { key: 'pdf', label: 'pdf', icon: 'image' },
    { key: 'png', label: 'PNG', icon: 'image-outline' },
  ];

  useEffect(() => {
    if (showActionsMenu) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showActionsMenu]);

  const handleShare = async () => {
    setShowActionsMenu(false);
    if (!canExportPdf()) {
      showUpgrade('pdf_export');
      return;
    }
    try {
      const uris = pages.length > 0 ? pages : document.imageUri ? [document.imageUri] : [];
      await shareDocumentAsPdf(uris, document.title || 'Document');
    } catch (error) {
      if (__DEV__) console.error('Share error:', error);
      Alert.alert('Error', 'Could not share the document as PDF.');
    }
  };

  const handleDelete = () => {
    setShowActionsMenu(false);
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => onDelete?.(document)
        },
      ]
    );
  };

  const handleRename = () => {
    setShowActionsMenu(false);
    setNewDocName(document.title.replace(/\.(pdf|jpg|jpeg|png)$/i, ''));
    setShowRenameModal(true);
  };

  const confirmRename = () => {
    if (newDocName.trim() && onRename) {
      const extension = document.type === 'pdf' ? '.pdf' : 
                        document.type === 'png' ? '.png' : '.jpg';
      onRename(document.id, newDocName.trim() + extension);
    }
    setShowRenameModal(false);
  };

  const handleCrop = () => {
    setShowActionsMenu(false);
    setCropPageIndex(currentPageIndex);
    setCropArea(defaultCropArea);
    setShowCropModal(true);
  };

  const cropCurrentImageUri = pages[cropPageIndex] || document.imageUri || null;

  const goToCropPrevPage = () => {
    if (cropPageIndex > 0) {
      setCropPageIndex(cropPageIndex - 1);
      setCropArea(defaultCropArea);
    }
  };

  const goToCropNextPage = () => {
    if (cropPageIndex < pages.length - 1) {
      setCropPageIndex(cropPageIndex + 1);
      setCropArea(defaultCropArea);
    }
  };

  const applyCrop = async () => {
    const uriToCrop = cropCurrentImageUri;
    if (!uriToCrop) {
      Alert.alert('Error', 'No image to crop');
      return;
    }
    try {
      setIsCropping(true);

      const cropX = Math.max(0, Math.round((cropArea.x / width) * 1000));
      const cropY = Math.max(0, Math.round((cropArea.y / (SCREEN_HEIGHT * 0.5)) * 1000));
      const cropWidth = Math.round((cropArea.width / width) * 1000);
      const cropHeight = Math.round((cropArea.height / (SCREEN_HEIGHT * 0.5)) * 1000);

      const result = await ImageManipulator.manipulateAsync(
        uriToCrop,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: Math.max(100, cropWidth),
              height: Math.max(100, cropHeight),
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (pages.length > 0 && result.uri) {
        const newPages = [...pages];
        newPages[cropPageIndex] = result.uri;
        setPages(newPages);
        onUpdateDocumentPages?.(document.id, newPages);
      }

      setShowCropModal(false);
      setIsCropping(false);
      Alert.alert('Success', 'Image cropped successfully!');
    } catch (error) {
      if (__DEV__) console.error('Crop error:', error);
      setIsCropping(false);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    }
  };

  const handleConvert = () => {
    setShowActionsMenu(false);
    setShowFormatModal(true);
  };

  const handleTranslate = () => {
    setShowActionsMenu(false);
    if (onUpgrade) {
      onUpgrade();
    } else {
      Alert.alert(
        'Premium Feature',
        'Translate is a premium feature. Upgrade to unlock!',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddPage = () => {
    // Directly open camera to add a new page
    if (onAddPage) {
      onAddPage();
    } else {
      Alert.alert('Add Page', 'Camera will open to capture a new page.');
    }
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one page.');
      return;
    }
    
    Alert.alert(
      'Delete Page',
      'Are you sure you want to delete this page?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const newPages = pages.filter((_, i) => i !== index);
            setPages(newPages);
            // Adjust current page index if needed
            if (currentPageIndex >= newPages.length) {
              setCurrentPageIndex(newPages.length - 1);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{document.title}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleRename}>
          <Ionicons name="pencil" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Image Preview with Swipe */}
        <View style={styles.imageContainer}>
          {pages.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={pages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setCurrentPageIndex(newIndex);
              }}
              renderItem={({ item }) => (
                <View style={styles.pageSlide}>
                  <Image
                    source={{ uri: item }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              initialScrollIndex={currentPageIndex}
            />
          ) : document.imageUri ? (
            <Image
              source={{ uri: document.imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              {document.type === 'pdf' ? (
                <MaterialCommunityIcons name="file-pdf-box" size={80} color={Colors.error} />
              ) : (
                <Ionicons name="image-outline" size={80} color="rgba(255,255,255,0.5)" />
              )}
              <Text style={styles.placeholderText}>{document.title}</Text>
            </View>
          )}
        </View>

        {/* Page Indicator Dots */}
        {pages.length > 1 && (
          <View style={styles.pageDotsContainer}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageDot,
                  currentPageIndex === index && styles.pageDotActive
                ]}
              />
            ))}
            <Text style={styles.pageCountText}>{currentPageIndex + 1} / {pages.length}</Text>
          </View>
        )}

        {/* Thumbnails */}
        <ScrollView 
          horizontal 
          style={styles.thumbnailsScrollView}
          contentContainerStyle={styles.thumbnailsContainer}
          showsHorizontalScrollIndicator={false}
        >
          {pages.length > 0 ? (
            pages.map((pageUri, index) => (
              <View key={index} style={styles.thumbnailOuterWrapper}>
                <TouchableOpacity 
                  style={[
                    styles.thumbnailWrapper,
                    currentPageIndex === index && styles.thumbnailActive
                  ]}
                  onPress={() => {
                    setCurrentPageIndex(index);
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                  }}
                >
                  <Image
                    source={{ uri: pageUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                {pages.length > 1 && (
                  <TouchableOpacity 
                    style={styles.deleteThumbnailButton}
                    onPress={() => handleDeletePage(index)}
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : document.imageUri ? (
            <View style={styles.thumbnailActive}>
              <Image
                source={{ uri: document.imageUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="document-outline" size={20} color="rgba(255,255,255,0.5)" />
            </View>
          )}
          <TouchableOpacity style={styles.addPageButton} onPress={handleAddPage}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Crop */}
          <TouchableOpacity style={styles.actionButton} onPress={handleCrop}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="crop-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Crop</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.primary} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions Menu Modal */}
      <Modal
        visible={showActionsMenu}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <View style={styles.actionsOverlay}>
          <Animated.View 
            style={[
              styles.actionsBackdrop,
              { opacity: backdropAnim }
            ]}
          >
            <Pressable 
              style={StyleSheet.absoluteFill}
              onPress={() => setShowActionsMenu(false)}
            />
          </Animated.View>
          <Animated.View 
            style={[
              styles.actionsSheet,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.actionsHandle} />
            
            <View style={styles.menuDocPreview}>
              <View style={styles.menuDocIcon}>
                {document.imageUri ? (
                  <Image source={{ uri: document.imageUri }} style={styles.menuDocImage} />
                ) : document.type === 'pdf' ? (
                  <MaterialCommunityIcons name="file-pdf-box" size={32} color={Colors.error} />
                ) : (
                  <Ionicons name="image" size={32} color={Colors.primary} />
                )}
              </View>
              <View style={styles.menuDocInfo}>
                <Text style={styles.menuDocTitle} numberOfLines={1}>{document.title}</Text>
                <Text style={styles.menuDocDate}>{document.date}</Text>
              </View>
            </View>

            <View style={styles.actionsHorizontal}>
              <TouchableOpacity 
                style={styles.actionHorizontalItem}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                  <Ionicons name="share-outline" size={22} color={Colors.text} />
                </View>
                <Text style={styles.actionHorizontalLabel}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionHorizontalItem}
                onPress={handleRename}
                activeOpacity={0.7}
              >
                <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                  <Ionicons name="pencil-outline" size={22} color={Colors.text} />
                </View>
                <Text style={styles.actionHorizontalLabel}>Rename</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionHorizontalItem}
                onPress={handleCrop}
                activeOpacity={0.7}
              >
                <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                  <Ionicons name="crop-outline" size={22} color={Colors.text} />
                </View>
                <Text style={styles.actionHorizontalLabel}>Crop</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionHorizontalItem}
                onPress={handleConvert}
                activeOpacity={0.7}
              >
                <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                  <Ionicons name="swap-horizontal-outline" size={22} color={Colors.text} />
                </View>
                <Text style={styles.actionHorizontalLabel}>Convert</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionHorizontalItem}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <View style={[styles.actionHorizontalIcon, styles.actionHorizontalIconDelete]}>
                  <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.actionHorizontalLabelDelete}>Delete</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomButtonsColumn}>
              <TouchableOpacity 
                style={styles.bottomCancelButton} 
                onPress={() => setShowActionsMenu(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.bottomCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.renameOverlay}>
          <Pressable 
            style={styles.actionsBackdrop} 
            onPress={() => setShowRenameModal(false)}
          />
          <View style={styles.renameSheet}>
            <Text style={styles.renameTitle}>Rename Document</Text>
            <TextInput
              style={styles.renameInput}
              value={newDocName}
              onChangeText={setNewDocName}
              placeholder="Enter new name"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity 
                style={styles.renameCancelButton}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.renameConfirmButton}
                onPress={confirmRename}
              >
                <Text style={styles.renameConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Format Selection Modal */}
      <Modal
        visible={showFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFormatModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFormatModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Convert Format</Text>
            <View style={styles.formatOptions}>
              {formats.map((format) => (
                <TouchableOpacity
                  key={format.key}
                  style={[
                    styles.formatOption,
                    selectedFormat === format.key && styles.formatOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedFormat(format.key);
                    setShowFormatModal(false);
                    Alert.alert('Convert', `Document will be converted to ${format.label} format.`);
                  }}
                >
                  <Ionicons
                    name={format.icon as any}
                    size={32}
                    color={selectedFormat === format.key ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.formatOptionLabel,
                      selectedFormat === format.key && styles.formatOptionLabelActive,
                    ]}
                  >
                    {format.label}
                  </Text>
                  {selectedFormat === format.key && (
                    <View style={styles.checkmarkIcon}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Crop Modal */}
      <Modal
        visible={showCropModal}
        animationType="slide"
        onRequestClose={() => setShowCropModal(false)}
      >
        <SafeAreaView style={styles.cropContainer} edges={['top']}>
          <View style={styles.cropHeader}>
            <TouchableOpacity 
              style={styles.cropHeaderButton} 
              onPress={() => setShowCropModal(false)}
            >
              <Text style={styles.cropCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.cropTitle}>Crop Image</Text>
            <TouchableOpacity 
              style={styles.cropHeaderButton} 
              onPress={applyCrop}
              disabled={isCropping}
            >
              <Text style={[styles.cropDoneText, isCropping && { opacity: 0.5 }]}>
                {isCropping ? 'Processing...' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>

          {pages.length > 1 && (
            <View style={styles.cropPageNav}>
              <TouchableOpacity
                style={styles.cropPageNavArrow}
                onPress={goToCropPrevPage}
                disabled={cropPageIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={cropPageIndex === 0 ? Colors.textTertiary : '#FFFFFF'}
                />
              </TouchableOpacity>
              <Text style={styles.cropPageNavText}>
                Page {cropPageIndex + 1} of {pages.length}
              </Text>
              <TouchableOpacity
                style={styles.cropPageNavArrow}
                onPress={goToCropNextPage}
                disabled={cropPageIndex === pages.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={cropPageIndex === pages.length - 1 ? Colors.textTertiary : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.cropPreviewContainer}>
            {cropCurrentImageUri && (
              <Image
                source={{ uri: cropCurrentImageUri }}
                style={styles.cropPreviewImage}
                resizeMode="contain"
              />
            )}
            
            <View style={styles.cropOverlay}>
              <View style={[styles.cropDarkArea, { top: 0, left: 0, right: 0, height: cropArea.y }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y + cropArea.height, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y, left: 0, width: cropArea.x, height: cropArea.height }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y, right: 0, width: width - cropArea.x - cropArea.width, height: cropArea.height }]} />
              
              <View style={[
                styles.cropFrame,
                {
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                }
              ]}>
                {/* Center drag area - for moving the whole frame */}
                <View 
                  style={styles.cropCenterDragArea}
                  {...framePanResponder.panHandlers}
                />
                
                <View 
                  style={[styles.cropCorner, styles.cropCornerTL, activeCorner === 'TL' && styles.cropCornerActive]} 
                  {...tlPanResponder.panHandlers}
                />
                <View 
                  style={[styles.cropCorner, styles.cropCornerTR, activeCorner === 'TR' && styles.cropCornerActive]} 
                  {...trPanResponder.panHandlers}
                />
                <View 
                  style={[styles.cropCorner, styles.cropCornerBL, activeCorner === 'BL' && styles.cropCornerActive]} 
                  {...blPanResponder.panHandlers}
                />
                <View 
                  style={[styles.cropCorner, styles.cropCornerBR, activeCorner === 'BR' && styles.cropCornerActive]} 
                  {...brPanResponder.panHandlers}
                />
                
                <View style={[styles.cropGridLine, styles.cropGridLineH1]} />
                <View style={[styles.cropGridLine, styles.cropGridLineH2]} />
                <View style={[styles.cropGridLine, styles.cropGridLineV1]} />
                <View style={[styles.cropGridLine, styles.cropGridLineV2]} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#1a1a2e',
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 200,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a4a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  pageSlide: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pageDotActive: {
    backgroundColor: Colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pageCountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  thumbnailsScrollView: {
    maxHeight: 100,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumbnailOuterWrapper: {
    position: 'relative',
  },
  thumbnailWrapper: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPageButton: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  deleteThumbnailButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Add Page Modal
  addPageModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addPageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  addPageSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  addPageHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginBottom: 16,
  },
  addPageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  addPageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addPageIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPageOptionText: {
    flex: 1,
    marginLeft: 14,
  },
  addPageOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  addPageOptionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addPageCancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addPageCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bottomSection: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formatLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  formatBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.error,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Actions Modal
  actionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  actionsSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionsHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuDocIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  menuDocImage: {
    width: '100%',
    height: '100%',
  },
  menuDocInfo: {
    flex: 1,
  },
  menuDocTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  menuDocDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 10,
  },
  actionHorizontalItem: {
    alignItems: 'center',
  },
  actionHorizontalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionHorizontalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text,
  },
  actionHorizontalIconDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  actionHorizontalLabelDelete: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.error,
  },
  bottomButtonsColumn: {
    paddingHorizontal: 0,
    paddingTop: 16,
  },
  bottomCancelButton: {
    height: 52,
    backgroundColor: Colors.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bottomCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Rename Modal
  renameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameSheet: {
    width: width - 48,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  renameInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  renameCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  renameConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Format Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 48,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  formatOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  formatOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    width: (width - 96) / 3,
  },
  formatOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EEF2FF',
  },
  formatOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  formatOptionLabelActive: {
    color: Colors.primary,
  },
  checkmarkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Crop Modal
  cropContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
  },
  cropPageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cropPageNavArrow: {
    padding: 8,
  },
  cropPageNavText: {
    fontSize: 15,
    color: Colors.textTertiary,
    minWidth: 100,
    textAlign: 'center',
  },
  cropHeaderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cropCancelText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  cropTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cropDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  cropPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  cropPreviewImage: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cropDarkArea: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cropCenterDragArea: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    bottom: 40,
  },
  cropCorner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  cropCornerActive: {
    borderColor: Colors.primary,
  },
  cropCornerTL: {
    top: -4,
    left: -4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cropCornerTR: {
    top: -4,
    right: -4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cropCornerBL: {
    bottom: -4,
    left: -4,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cropCornerBR: {
    bottom: -4,
    right: -4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  cropGridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cropGridLineH1: {
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
  },
  cropGridLineH2: {
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
  },
  cropGridLineV1: {
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
  },
  cropGridLineV2: {
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
  },
});
