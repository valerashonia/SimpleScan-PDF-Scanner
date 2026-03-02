import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

interface PreviewScreenProps {
  imageUri: string;
  onClose: () => void;
  onSave: (data: { uri: string; name: string; format: string; pageUris?: string[] }) => void;
  onRetake: () => void;
  onUpgrade?: () => void;
  initialPages?: string[];
  onAddPage?: () => void;
  onUpdatePages?: (pages: string[]) => void;
}


export default function PreviewScreen({ 
  imageUri, 
  onClose, 
  onSave, 
  onRetake,
  onUpgrade,
  initialPages,
  onAddPage,
  onUpdatePages,
}: PreviewScreenProps) {
  const [documentName, setDocumentName] = useState(
    `Scan_${new Date().toISOString().slice(0, 10)}`
  );
  const [showCropModal, setShowCropModal] = useState(false);
  const [pages, setPages] = useState<string[]>(initialPages && initialPages.length > 0 ? initialPages : [imageUri]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  
  // Update pages when initialPages changes (e.g., when new page is added from camera)
  React.useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
      setCurrentPageIndex(initialPages.length - 1);
    }
  }, [initialPages]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [tempDocName, setTempDocName] = useState(documentName);
  
  // Crop area state
  const [cropArea, setCropArea] = useState({
    x: 40,
    y: 80,
    width: width - 80,
    height: 300,
  });
  const [cropPageIndex, setCropPageIndex] = useState(0);
  const defaultCropArea = { x: 40, y: 80, width: width - 80, height: 300 };
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const lastCropArea = useRef(cropArea);
  const gestureStartCropArea = useRef(cropArea);
  lastCropArea.current = cropArea;
  const insets = useSafeAreaInsets();

  const handleCornerDrag = (corner: string, gestureState: PanResponderGestureState) => {
    const { dx, dy } = gestureState;
    const minSize = 80;
    const base = gestureStartCropArea.current;
    let newArea = { ...base };
    
    switch (corner) {
      case 'TL':
        newArea.x = Math.max(0, base.x + dx);
        newArea.y = Math.max(0, base.y + dy);
        newArea.width = Math.max(minSize, base.width - dx);
        newArea.height = Math.max(minSize, base.height - dy);
        break;
      case 'TR':
        newArea.y = Math.max(0, base.y + dy);
        newArea.width = Math.max(minSize, base.width + dx);
        newArea.height = Math.max(minSize, base.height - dy);
        break;
      case 'BL':
        newArea.x = Math.max(0, base.x + dx);
        newArea.width = Math.max(minSize, base.width - dx);
        newArea.height = Math.max(minSize, base.height + dy);
        break;
      case 'BR':
        newArea.width = Math.max(minSize, base.width + dx);
        newArea.height = Math.max(minSize, base.height + dy);
        break;
    }
    
    // Clamp to screen bounds
    newArea.width = Math.min(newArea.width, width - newArea.x);
    newArea.height = Math.min(newArea.height, height - 200 - newArea.y);
    
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
    newY = Math.max(0, Math.min(newY, height - 200 - base.height));
    
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

  const handleSave = () => {
    if (!documentName.trim()) {
      Alert.alert('Error', 'Please enter a document name');
      return;
    }
    const urisToSave = pages.filter((p): p is string => p !== 'blank' && typeof p === 'string');
    onSave({
      uri: imageUri,
      name: documentName.trim(),
      format: 'pdf',
      pageUris: urisToSave.length > 0 ? urisToSave : undefined,
    });
  };

  const handleCrop = () => {
    setCropPageIndex(currentPageIndex);
    setCropArea(defaultCropArea);
    setShowCropModal(true);
  };

  const cropCurrentImage = pages[cropPageIndex];
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

  const handleRename = () => {
    setTempDocName(documentName);
    setShowRenameModal(true);
  };

  const confirmRename = () => {
    if (tempDocName.trim()) {
      setDocumentName(tempDocName.trim());
      setShowRenameModal(false);
    }
  };

  const applyCrop = async () => {
    const currentImage = cropCurrentImage;
    if (currentImage === 'blank' || !currentImage) {
      Alert.alert('Error', 'Cannot crop a blank page');
      return;
    }
    try {
      setIsCropping(true);

      const cropX = Math.max(0, Math.round((cropArea.x / width) * 1000));
      const cropY = Math.max(0, Math.round((cropArea.y / (height * 0.5)) * 1000));
      const cropWidth = Math.round((cropArea.width / width) * 1000);
      const cropHeight = Math.round((cropArea.height / (height * 0.5)) * 1000);

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        currentImage,
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

      const newPages = [...pages];
      newPages[cropPageIndex] = manipulatedImage.uri;
      setPages(newPages);

      setShowCropModal(false);
      setIsCropping(false);
      Alert.alert('Success', 'Image cropped successfully!');
    } catch (error) {
      if (__DEV__) console.error('Crop error:', error);
      setIsCropping(false);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    }
  };

  const handleAddPage = () => {
    // Open camera to add a new page
    if (onAddPage) {
      onAddPage();
    } else {
      onRetake();
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
            // Notify parent about page update
            if (onUpdatePages) {
              onUpdatePages(newPages);
            }
            // Adjust current page index if needed
            if (currentPageIndex >= newPages.length) {
              setCurrentPageIndex(newPages.length - 1);
            } else if (currentPageIndex > index) {
              setCurrentPageIndex(currentPageIndex - 1);
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{documentName}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleRename}>
          <Ionicons name="pencil" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {pages[currentPageIndex] && pages[currentPageIndex] !== 'blank' ? (
            <Image
              source={{ uri: pages[currentPageIndex] }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          {/* Page indicator */}
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentPageIndex + 1} / {pages.length}</Text>
          </View>
        </View>

        {/* Thumbnails */}
        <View style={styles.thumbnailsContainer}>
          {pages.map((page, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.thumbnailWrapper,
                currentPageIndex === index && styles.thumbnailActive
              ]}
              onPress={() => setCurrentPageIndex(index)}
            >
              {page === 'blank' ? (
                <View style={styles.blankPage}>
                  <Ionicons name="document-outline" size={24} color="rgba(255,255,255,0.5)" />
                </View>
              ) : (
                <Image
                  source={{ uri: page }}
                  style={styles.thumbnail}
                  resizeMode="contain"
                />
              )}
              {/* Delete button */}
              {pages.length > 1 && (
                <TouchableOpacity 
                  style={styles.deleteThumbnailButton}
                  onPress={() => handleDeletePage(index)}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addPageButton} onPress={handleAddPage}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Actions - 3 Main Functions */}
      <View style={[styles.bottomSection, { paddingTop: 16, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* 1. Crop/Edit */}
          <TouchableOpacity style={styles.actionButton} onPress={handleCrop}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="crop-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Crop</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="save-outline" size={22} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.renameOverlay}>
          <View style={styles.renameBackdrop} />
          <View style={styles.renameSheet}>
            <Text style={styles.renameTitle}>Rename Document</Text>
            <TextInput
              style={styles.renameInput}
              value={tempDocName}
              onChangeText={setTempDocName}
              placeholder="Enter document name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoFocus
              selectTextOnFocus
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

      {/* Crop Modal */}
      <Modal
        visible={showCropModal}
        animationType="slide"
        onRequestClose={() => setShowCropModal(false)}
      >
        <SafeAreaView style={styles.cropContainer} edges={['top']}>
          {/* Crop Header */}
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

          {/* Crop Preview Area */}
          <View style={styles.cropPreviewContainer}>
            <Image
              source={{ uri: cropCurrentImage !== 'blank' ? cropCurrentImage : imageUri }}
              style={styles.cropPreviewImage}
              resizeMode="contain"
            />
            
            {/* Crop overlay with draggable area */}
            <View style={styles.cropOverlay}>
              {/* Dark areas outside crop */}
              <View style={[styles.cropDarkArea, { top: 0, left: 0, right: 0, height: cropArea.y }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y + cropArea.height, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y, left: 0, width: cropArea.x, height: cropArea.height }]} />
              <View style={[styles.cropDarkArea, { top: cropArea.y, right: 0, width: width - cropArea.x - cropArea.width, height: cropArea.height }]} />
              
              {/* Crop frame */}
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
                
                {/* Corner handles - draggable */}
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
                
                {/* Grid lines */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 200,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
  thumbnailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  thumbnailWrapper: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailActive: {
    borderColor: Colors.primary,
  },
  deleteThumbnailButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  addPageButton: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#9359FF',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Rename Modal styles
  renameOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  renameBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  renameSheet: {
    backgroundColor: '#2a2a4a',
    borderRadius: 16,
    padding: 24,
    width: width - 48,
    maxWidth: 340,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  renameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  renameCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  renameConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Blank page style
  blankPage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Crop Modal Styles
  cropContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
