import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DocumentViewerScreen from './DocumentViewerScreen';
import { shareDocumentAsPdf } from '../services/pdfService';
import { useSubscription } from '../contexts/SubscriptionContext';

interface Document {
  id: string;
  title: string;
  date: string;
  pages: number;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'pdf' | 'png' | 'image';
  imageUri?: string;
  pageImages?: string[];
}

interface DashboardScreenProps {
  scannedDocuments?: Document[];
  onDeleteDocument?: (docId: string) => void;
  onRenameDocument?: (docId: string, newTitle: string) => void;
  onOpenCamera?: () => void;
  onOpenPassportCamera?: () => void;
  onOpenGallery?: () => void;
  onOpenFiles?: () => void;
  openCameraForAddPage?: (callback: (uri: string) => void) => void;
  onUpdateDocumentPages?: (docId: string, pageImages: string[]) => void;
  onUpgrade?: () => void;
}

const truncateFileName = (name: string, maxLength: number = 12): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

export default function DashboardScreen({ 
  scannedDocuments = [], 
  onDeleteDocument,
  onRenameDocument,
  onOpenCamera,
  onOpenPassportCamera,
  onOpenGallery,
  onOpenFiles,
  openCameraForAddPage,
  onUpdateDocumentPages,
  onUpgrade,
}: DashboardScreenProps) {
  const navigation = useNavigation();
  const { canExportPdf, showUpgrade } = useSubscription();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showItemActions, setShowItemActions] = useState(false);
  const [actionTargetDoc, setActionTargetDoc] = useState<Document | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Animation for settings panel (slide from right)
  const settingsSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const settingsBackdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSettings) {
      Animated.parallel([
        Animated.timing(settingsSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(settingsBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(settingsSlideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(settingsBackdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSettings]);
  
  // Animation for bottom sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showItemActions) {
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
  }, [showItemActions]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [localDocuments, setLocalDocuments] = useState<Document[]>([]);
  const insets = useSafeAreaInsets();

  const handleOpenDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedDocument(null);
  };

  const handleShareDocument = async (doc: any) => {
    if (!doc) return;
    if (!canExportPdf()) {
      setShowItemActions(false);
      setRenameModalVisible(false);
      showUpgrade('pdf_export');
      return;
    }
    setShowItemActions(false);
    setRenameModalVisible(false);
    try {
      if (!canExportPdf()) return;
      const uris = Array.isArray(doc.pageImages) && doc.pageImages.length > 0
        ? doc.pageImages
        : doc.imageUri ? [doc.imageUri] : [];
      await shareDocumentAsPdf(uris, doc.title || 'Document');
    } catch (error) {
      if (__DEV__) console.error('Share error:', error);
      Alert.alert('Error', 'Could not share the document as PDF.');
    }
  };

  const handleDeleteDocument = (doc: any) => {
    setShowItemActions(false);
    if (!doc) return;
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleCloseViewer();
            if (onDeleteDocument && doc.imageUri) {
              onDeleteDocument(doc.id);
            }
            Alert.alert('Deleted', `${doc.title} has been deleted.`);
          },
        },
      ]
    );
  };

  const handleRenameDocument = (doc: Document) => {
    setNewDocName(doc.title.replace('.pdf', '').replace('.jpg', '').replace('.png', ''));
    setShowItemActions(false);
    setRenameModalVisible(true);
  };

  const handleCropDocument = (doc: Document) => {
    setShowItemActions(false);
    if (doc.imageUri) {
      setSelectedDocument(doc);
      setShowViewer(true);
    } else {
      Alert.alert('Cannot Crop', 'This document does not have an image to crop.');
    }
  };

  const handleConvertDocument = (doc: Document) => {
    setShowItemActions(false);
    setShowConvertModal(true);
  };

  const performConvert = (newType: 'pdf' ) => {
    if (!actionTargetDoc) return;
    
    const oldExtension = '.pdf';
    const newExtension = '.pdf';
    const baseName = actionTargetDoc.title.replace('.pdf', '');
    const newTitle = baseName + '.pdf';
    
    // Update local documents
    setLocalDocuments(prev => 
      prev.map(d => d.id === actionTargetDoc.id 
        ? { ...d, title: newTitle, type: newType }
        : d
      )
    );
    
    // Also update via prop if available
    if (onRenameDocument) {
      onRenameDocument(actionTargetDoc.id, newTitle);
    }
    
    setShowConvertModal(false);
    setActionTargetDoc(null);
    Alert.alert('Success', `Document converted to ${newType.toUpperCase()}`);
  };

  const confirmRename = () => {
    if (actionTargetDoc && newDocName.trim()) {
      const extension = '.pdf';
      const newTitle = newDocName.trim() + extension;
      
      // Update local documents (for demo documents)
      setLocalDocuments(prev => 
        prev.map(d => d.id === actionTargetDoc.id 
          ? { ...d, title: newTitle }
          : d
        )
      );
      
      // Also update via prop if available (for scanned documents)
      if (onRenameDocument) {
        onRenameDocument(actionTargetDoc.id, newTitle);
      }
      
      setRenameModalVisible(false);
      setNewDocName('');
      setActionTargetDoc(null);
      Alert.alert('Success', 'Document renamed successfully');
    }
  };

  const handleItemActions = (doc: Document) => {
    setActionTargetDoc(doc);
    setShowItemActions(true);
  };

  const handleRenameFromViewer = (docId: string, newTitle: string) => {
    setLocalDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, title: newTitle } : d)
    );
    if (onRenameDocument) onRenameDocument(docId, newTitle);
    if (selectedDocument?.id === docId) {
      setSelectedDocument(prev => prev ? { ...prev, title: newTitle } : null);
    }
  };

  const addingPageToDocRef = useRef<Document | null>(null);

  const handleAddPageFromViewer = () => {
    if (!selectedDocument || !openCameraForAddPage) {
      if (onOpenCamera) onOpenCamera();
      return;
    }
    addingPageToDocRef.current = selectedDocument;
    setShowViewer(false);
    openCameraForAddPage((uri: string) => {
      const doc = addingPageToDocRef.current;
      addingPageToDocRef.current = null;
      if (!doc) return;
      const existingPages: string[] =
        Array.isArray(doc.pageImages) && doc.pageImages.length > 0
          ? [...doc.pageImages]
          : doc.imageUri
            ? [doc.imageUri]
            : [];
      const newPageImages = [...existingPages, uri];
      const updated: Document = {
        ...doc,
        pageImages: newPageImages,
        pages: newPageImages.length,
      };
      Alert.alert(
        'Save document?',
        `The document now has ${newPageImages.length} pages. Save changes?`,
        [
          { text: 'No', style: 'cancel', onPress: () => {
            setSelectedDocument(updated);
            setShowViewer(true);
          }},
          { text: 'Yes', onPress: () => {
            const fromScanned = scannedDocuments.some(d => d.id === doc.id);
            if (fromScanned && onUpdateDocumentPages) {
              onUpdateDocumentPages(doc.id, newPageImages);
            }
            setLocalDocuments(prev =>
              prev.map(d => d.id === doc.id ? { ...d, pageImages: newPageImages, pages: newPageImages.length } : d)
            );
            setSelectedDocument(updated);
            setShowViewer(true);
          }},
        ]
      );
    });
  };

  const allDocuments = [...scannedDocuments, ...localDocuments];
  const displayedDocuments = showAllDocuments ? allDocuments : allDocuments.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Documents</Text>
          <TouchableOpacity
            style={styles.upgradeHeaderButton}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="crown" size={18} color="#F0C45C" />
            <Text style={styles.upgradeHeaderText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {allDocuments.length === 0 ? (
          <>
            <View style={styles.emptyStateMiddle}>
              <View style={styles.emptyStateSection}>
                <View style={styles.emptyStateWrap}>
                  <View style={styles.emptyStateIllustration}>
                    <Image
                      source={require('../../assets/splash-app-icon.png')}
                      style={styles.emptyStateIconImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>Welcome to SimpleScan</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Tap the button below and scan{'\n'}your first document
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardsGrid, styles.cardsGridEmpty]}>
              <TouchableOpacity
                style={[styles.actionCard, styles.scanCardHighlight]}
                onPress={onOpenCamera}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIconContainer, { backgroundColor: Colors.primary }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Document</Text>
                <Text style={styles.cardTitleSecond}>Scan</Text>
                <Text style={styles.cardDescription}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={onOpenPassportCamera}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIconContainer, { backgroundColor: '#06B6D4' }]}>
                  <MaterialCommunityIcons name="passport" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Passport</Text>
                <Text style={styles.cardTitleSecond}>Scan</Text>
                <Text style={styles.cardDescription}>ID Document</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
        {/* Action Cards - Only 2 cards */}
        <View style={styles.cardsGrid}>
          {/* Document Scan Card - Highlighted */}
          <TouchableOpacity 
            style={[styles.actionCard, styles.scanCardHighlight]}
            onPress={onOpenCamera}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconContainer, { backgroundColor: Colors.primary }]}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Document</Text>
            <Text style={styles.cardTitleSecond}>Scan</Text>
            <Text style={styles.cardDescription}>Camera</Text>
          </TouchableOpacity>

          {/* Passport Scan Card */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={onOpenPassportCamera}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconContainer, { backgroundColor: '#06B6D4' }]}>
              <MaterialCommunityIcons name="passport" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Passport</Text>
            <Text style={styles.cardTitleSecond}>Scan</Text>
            <Text style={styles.cardDescription}>ID Document</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Files Header */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Files</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History' as never)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Documents List */}
        <View style={styles.documentsList}>
          {displayedDocuments.map((doc) => (
            <TouchableOpacity 
              key={doc.id} 
              style={styles.documentItem}
              onPress={() => handleOpenDocument(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.documentThumbnail}>
                {doc.imageUri ? (
                  <Image 
                    source={{ uri: doc.imageUri }} 
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.docPlaceholder}>
                    <MaterialCommunityIcons name="file-document-outline" size={32} color={Colors.textTertiary} />
                  </View>
                )}
              </View>

              {/* Document Info */}
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle} numberOfLines={1}>{truncateFileName(doc.title)}</Text>
                <Text style={styles.documentDate}>{doc.date}</Text>
                {doc.pages > 1 && (
                  <Text style={styles.documentPages}>{doc.pages} pages</Text>
                )}
              </View>

              {/* More Button - Centered */}
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => handleItemActions(doc)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Item Actions Modal */}
      <Modal
        visible={showItemActions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowItemActions(false)}
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
              onPress={() => setShowItemActions(false)}
            />
          </Animated.View>
          <Animated.View 
            style={[
              styles.actionsSheet,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.actionsHandle} />
            
            {actionTargetDoc && (
              <>
                <View style={styles.actionDocPreview}>
                  <View style={[
                    styles.actionDocIcon,
                    { backgroundColor: actionTargetDoc.type === 'pdf' ? '#FEE2E2' : '#DBEAFE' }
                  ]}>
                    {actionTargetDoc.imageUri ? (
                      <Image source={{ uri: actionTargetDoc.imageUri }} style={styles.actionDocImage} />
                    ) : actionTargetDoc.type === 'pdf' ? (
                      <MaterialCommunityIcons name="file-pdf-box" size={28} color={Colors.error} />
                    ) : (
                      <Ionicons name="image" size={28} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.actionDocInfo}>
                    <Text style={styles.actionDocTitle} numberOfLines={1}>{actionTargetDoc.title}</Text>
                    <Text style={styles.actionDocMeta}>{actionTargetDoc.date}</Text>
                  </View>
                </View>

                <View style={styles.actionsHorizontal}>
                  <TouchableOpacity 
                    style={styles.actionHorizontalItem} 
                    onPress={() => handleRenameDocument(actionTargetDoc)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                      <Ionicons name="pencil-outline" size={22} color={Colors.text} />
                    </View>
                    <Text style={styles.actionHorizontalLabel}>Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionHorizontalItem} 
                    onPress={() => handleShareDocument(actionTargetDoc)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionHorizontalIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                      <Ionicons name="share-outline" size={22} color={Colors.text} />
                    </View>
                    <Text style={styles.actionHorizontalLabel}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionHorizontalItem} 
                    onPress={() => handleDeleteDocument(actionTargetDoc)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionHorizontalIcon, styles.actionHorizontalIconDelete]}>
                      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                    </View>
                    <Text style={styles.actionHorizontalLabelDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <View style={styles.bottomButtonsColumn}>
                  <TouchableOpacity 
                    style={styles.bottomCancelButton} 
                    onPress={() => setShowItemActions(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bottomCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.renameOverlay}>
          <Pressable 
            style={styles.actionsBackdrop} 
            onPress={() => setRenameModalVisible(false)}
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
                onPress={() => setRenameModalVisible(false)}
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

      {/* Convert Modal */}
      <Modal
        visible={showConvertModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConvertModal(false)}
      >
        <View style={styles.convertModalOverlay}>
          <Pressable 
            style={styles.convertBackdrop} 
            onPress={() => setShowConvertModal(false)}
          />
          <View style={styles.convertSheet}>
            <View style={styles.convertHandle} />
            <View style={styles.convertHeader}>
              <TouchableOpacity 
                style={styles.convertBackButton}
                onPress={() => {
                  setShowConvertModal(false);
                  setShowItemActions(true);
                }}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.convertTitle}>Convert to</Text>
              <View style={styles.convertBackButton} />
            </View>
            
            <View style={styles.convertOptions}>
              {/* PDF */}
              <TouchableOpacity 
                style={styles.convertOption}
                onPress={() => performConvert('pdf')}
                disabled={actionTargetDoc?.type === 'pdf'}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.convertDocIcon,
                  actionTargetDoc?.type === 'pdf' && styles.convertOptionDisabled
                ]}>
                  <View style={styles.convertDocBody}>
                    <View style={styles.convertDocLines}>
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                    </View>
                  </View>
                  <View style={styles.convertDocFold} />
                  <View style={[styles.convertBadge, { backgroundColor: '#DC2626' }]}>
                    <Text style={styles.convertBadgeText}>PDF</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* JPG */}
              <TouchableOpacity 
                style={styles.convertOption}
                onPress={() => performConvert('pdf')}
                disabled={actionTargetDoc?.type === 'pdf'}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.convertDocIcon,
                  actionTargetDoc?.type === 'pdf' && styles.convertOptionDisabled
                ]}>
                  <View style={styles.convertDocBody}>
                    <View style={styles.convertDocLines}>
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                    </View>
                  </View>
                  <View style={styles.convertDocFold} />
                  <View style={[styles.convertBadge, { backgroundColor: '#2563EB' }]}>
                    <Text style={styles.convertBadgeText}>JPG</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* PNG */}
              <TouchableOpacity 
                style={styles.convertOption}
                onPress={() => performConvert('pdf')}
                disabled={actionTargetDoc?.type === 'png'}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.convertDocIcon,
                  actionTargetDoc?.type === 'png' && styles.convertOptionDisabled
                ]}>
                  <View style={styles.convertDocBody}>
                    <View style={styles.convertDocLines}>
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                      <View style={styles.convertDocLine} />
                    </View>
                  </View>
                  <View style={styles.convertDocFold} />
                  <View style={[styles.convertBadge, { backgroundColor: '#16A34A' }]}>
                    <Text style={styles.convertBadgeText}>PNG</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.convertCancelButton}
              onPress={() => setShowConvertModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.convertCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        visible={showViewer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedDocument && (
          <DocumentViewerScreen
            document={selectedDocument}
            onClose={handleCloseViewer}
            onShare={handleShareDocument}
            onDelete={handleDeleteDocument}
            onRename={handleRenameFromViewer}
            onAddPage={handleAddPageFromViewer}
            onUpdateDocumentPages={onUpdateDocumentPages}
          />
        )}
      </Modal>

      {/* Settings Modal - slides in from right */}
      <Modal
        visible={showSettings}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <Animated.View 
            style={[
              styles.settingsBackdrop,
              { opacity: settingsBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSettings(false)} />
          </Animated.View>
          <Animated.View 
            style={[
              styles.settingsPanel,
              { transform: [{ translateX: settingsSlideAnim }] }
            ]}
          >
            <View style={[styles.settingsModalWrapper, { paddingTop: insets.top }]}>
              <SafeAreaView style={styles.settingsContainer} edges={['left', 'right']}>
                <View style={styles.settingsHeader}>
                  <TouchableOpacity 
                    style={styles.settingsBackButton}
                    onPress={() => setShowSettings(false)}
                  >
                    <Ionicons name="chevron-back" size={24} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.settingsTitle}>Settings</Text>
                  <View style={{ width: 40 }} />
                </View>

              <ScrollView style={styles.settingsList}>
                {/* User Profile Section */}
                <View style={styles.profileSection}>
                  <View style={styles.profileAvatarLarge}>
                    <Ionicons name="person" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.profileName}>Document Scanner</Text>
                  <Text style={styles.profileEmail}>Free Account</Text>
                </View>

                {/* Settings Items */}
                <View style={styles.settingsGroup}>
                  <TouchableOpacity 
                    style={styles.settingsItem}
                    onPress={() => Alert.alert('Premium', 'გახდი პრემიუმ მომხმარებელი და მიიღე შეუზღუდავი წვდომა!')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingsIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="star" size={22} color="#F59E0B" />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemTitle}>Go Premium</Text>
                      <Text style={styles.settingsItemSubtitle}>Unlock all features</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.settingsItem}
                    onPress={() => Alert.alert('FAQ', 'ხშირად დასმული კითხვები:\n\n1. როგორ დავასკანეროთ დოკუმენტი?\n- დააჭირეთ Scan ღილაკს\n\n2. როგორ გავაზიაროთ?\n- გახსენით ფაილი და დააჭირეთ Share-ს\n\n3. როგორ წავშალოთ?\n- გახსენით ფაილი და დააჭირეთ Delete-ს')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingsIconWrapper, { backgroundColor: '#DBEAFE' }]}>
                      <Ionicons name="help-circle" size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemTitle}>FAQ</Text>
                      <Text style={styles.settingsItemSubtitle}>Frequently asked questions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                  <Text style={styles.appInfoText}>Document Scanner v{APP_VERSION}</Text>
                  <Text style={styles.appInfoText}>Made with ❤️</Text>
                </View>
              </ScrollView>
              </SafeAreaView>
            </View>
          </Animated.View>
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
  upgradeHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyStateMiddle: {
    paddingVertical: 24,
  },
  emptyStateSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyStateIllustration: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconImage: {
    width: 100,
    height: 100,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  emptyStateSubtitle: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  cardsGridEmpty: {
    marginTop: 40,
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerIconButton: {
    padding: 2,
  },
  userIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cardsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scanCardHighlight: {
    backgroundColor: Colors.surface,
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  cardTitleSecond: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  documentsList: {
    paddingHorizontal: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  documentThumbnail: {
    width: 56,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  docPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  documentPages: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginBottom: 20,
  },
  actionDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionDocIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  actionDocImage: {
    width: '100%',
    height: '100%',
  },
  actionDocInfo: {
    flex: 1,
  },
  actionDocTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionDocMeta: {
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
    flex: 1,
  },
  actionHorizontalIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionHorizontalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  actionHorizontalIconDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  actionHorizontalLabelDelete: {
    fontSize: 12,
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
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Rename Modal
  renameOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  renameSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  // Convert Modal styles
  convertModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  convertBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  convertSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  convertHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  convertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  convertBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  convertOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  convertOption: {
    alignItems: 'center',
  },
  convertDocIcon: {
    width: 56,
    height: 70,
    position: 'relative',
  },
  convertDocBody: {
    width: 56,
    height: 70,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  convertDocFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  convertDocLines: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 6,
  },
  convertDocLine: {
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  convertBadge: {
    position: 'absolute',
    top: 8,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  convertBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  convertOptionDisabled: {
    opacity: 0.4,
  },
  convertCancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  convertCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Settings styles
  settingsModalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  settingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  settingsPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
  },
  settingsModalWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  settingsList: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
});
