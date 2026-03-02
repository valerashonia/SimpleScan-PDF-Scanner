import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useSubscription } from '../contexts/SubscriptionContext';
import DocumentViewerScreen from './DocumentViewerScreen';
import { shareDocumentAsPdf } from '../services/pdfService';


interface DocumentItem {
  id: string;
  title: string;
  date: string;
  pages: number;
  size: string;
  type: 'pdf' | 'png' | 'image';
  imageUri?: string;
  pageImages?: string[];
}

interface ScannedDocument {
  id: string;
  title: string;
  date: string;
  pages: number;
  icon: string;
  type: 'pdf' | 'image';
  imageUri?: string;
  pageImages?: string[];
}

interface HistoryScreenProps {
  scannedDocuments?: ScannedDocument[];
  onDeleteDocument?: (docId: string) => void;
  openCameraForAddPage?: (callback: (uri: string) => void) => void;
  onUpdateDocumentPages?: (docId: string, pageImages: string[]) => void;
}

type SortType = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

const truncateFileName = (name: string, maxLength: number = 12): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

export default function HistoryScreen({ scannedDocuments = [], onDeleteDocument, openCameraForAddPage, onUpdateDocumentPages }: HistoryScreenProps) {
  const { canExportPdf, showUpgrade } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showItemActions, setShowItemActions] = useState(false);
  const [actionTargetDoc, setActionTargetDoc] = useState<DocumentItem | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>('date_desc');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [localDocuments, setLocalDocuments] = useState<DocumentItem[]>([]);

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

  const scannedAsDocItems: DocumentItem[] = scannedDocuments.map(doc => ({
    id: doc.id,
    title: doc.title,
    date: doc.date,
    pages: doc.pages,
    size: '1.0 MB',
    type: doc.type,
    imageUri: doc.imageUri,
    pageImages: doc.pageImages,
  }));

  const allDocuments = [...scannedAsDocItems, ...localDocuments];

  const filteredDocuments = allDocuments
    .filter((doc) => {
      if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortType) {
        case 'date_desc':
          // Sort by index in original array (newer items first)
          return allDocuments.indexOf(a) - allDocuments.indexOf(b);
        case 'date_asc':
          // Sort by index in original array (older items first)
          return allDocuments.indexOf(b) - allDocuments.indexOf(a);
        case 'name_asc':
          return a.title.localeCompare(b.title);
        case 'name_desc':
          return b.title.localeCompare(a.title);
        case 'size_desc':
          return parseFloat(b.size) - parseFloat(a.size);
        case 'size_asc':
          return parseFloat(a.size) - parseFloat(b.size);
        default:
          return 0;
      }
    });

  const sortOptions: { key: SortType; label: string; icon: string }[] = [
    { key: 'date_desc', label: 'Newest First', icon: 'calendar' },
    { key: 'date_asc', label: 'Oldest First', icon: 'calendar-outline' },
    { key: 'name_asc', label: 'Name (A-Z)', icon: 'text' },
    { key: 'name_desc', label: 'Name (Z-A)', icon: 'text-outline' },
  ];

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenDocument = (doc: DocumentItem) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedDocument(null);
  };

  const handleShareDocument = async (doc: DocumentItem | null) => {
    setShowItemActions(false);
    if (!doc) return;
    if (!canExportPdf()) {
      showUpgrade('pdf_export');
      return;
    }
    try {
      const uris = Array.isArray(doc.pageImages) && doc.pageImages.length > 0
        ? doc.pageImages
        : doc.imageUri ? [doc.imageUri] : [];
      await shareDocumentAsPdf(uris, doc.title || 'Document');
    } catch (error) {
      if (__DEV__) console.error('Share error:', error);
      Alert.alert('Error', 'Could not share the document as PDF.');
    }
  };

  const handleDeleteDocument = (doc: DocumentItem | null) => {
    if (!doc) return;
    setShowItemActions(false);
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

  const handleRenameDocument = (doc: DocumentItem) => {
    setNewDocName(doc.title.replace('.pdf', '').replace('.jpg', '').replace('.png', ''));
    setShowItemActions(false);
    setRenameModalVisible(true);
  };

  const confirmRename = () => {
    if (actionTargetDoc && newDocName.trim()) {
      const extension = '.pdf';
      const newTitle = newDocName.trim() + extension;
      
      setLocalDocuments(prev => 
        prev.map(d => d.id === actionTargetDoc.id 
          ? { ...d, title: newTitle }
          : d
        )
      );
      
      setRenameModalVisible(false);
      setNewDocName('');
      setActionTargetDoc(null);
      Alert.alert('Success', 'Document renamed successfully');
    }
  };

  const handleRenameFromViewer = (docId: string, newTitle: string) => {
    setLocalDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, title: newTitle } : d)
    );
    if (selectedDocument?.id === docId) {
      setSelectedDocument(prev => prev ? { ...prev, title: newTitle } : null);
    }
  };

  const handleCropDocument = (doc: DocumentItem) => {
    setShowItemActions(false);
    if (doc.imageUri) {
      setSelectedDocument(doc);
      setShowViewer(true);
    } else {
      Alert.alert('Cannot Crop', 'This document does not have an image to crop.');
    }
  };

  const handleConvertDocument = (doc: DocumentItem) => {
    setShowItemActions(false);
    setShowConvertModal(true);
  };

  const performConvert = (newType: 'pdf' | 'png') => {
    if (!actionTargetDoc) return;
    
    const newExtension = '.pdf';
    const baseName = actionTargetDoc.title.replace('.pdf', '').replace('.jpg', '').replace('.png', '');
    const newTitle = baseName + newExtension;
    
    // Update local documents
    setLocalDocuments(prev => 
      prev.map(d => d.id === actionTargetDoc.id 
        ? { ...d, title: newTitle, type: newType }
        : d
      )
    );
    
    setShowConvertModal(false);
    setActionTargetDoc(null);
    Alert.alert('Success', `Document converted to ${newType.toUpperCase()}`);
  };

  const handleItemActions = (doc: DocumentItem) => {
    setActionTargetDoc(doc);
    setShowItemActions(true);
  };

  const addingPageToDocRef = useRef<DocumentItem | null>(null);

  const handleAddPageFromViewer = () => {
    if (!selectedDocument || !openCameraForAddPage) {
      Alert.alert('Add Page', 'Please use Document Scan from Home to add pages.');
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
      const updated: DocumentItem = {
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

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Selected',
      `Are you sure you want to delete ${selectedItems.length} items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            selectedItems.forEach(id => {
              if (onDeleteDocument) onDeleteDocument(id);
            });
            setSelectedItems([]);
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Files</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Ionicons
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
              size={22}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Bar */}
      {selectedItems.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedItems.length} selected</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionButton}>
              <Ionicons name="share-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionButton}>
              <Ionicons name="folder-outline" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionButton} onPress={handleBulkDelete}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setSelectedItems([])}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Document List/Grid */}
      <ScrollView
        style={styles.documentContainer}
        contentContainerStyle={
          viewMode === 'grid' ? styles.gridContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredDocuments.map((doc) =>
          viewMode === 'list' ? (
            <DocumentListItem
              key={doc.id}
              document={doc}
              isSelected={selectedItems.includes(doc.id)}
              onPress={() => handleOpenDocument(doc)}
              onLongPress={() => toggleSelection(doc.id)}
              onMorePress={() => handleItemActions(doc)}
            />
          ) : (
            <DocumentGridItem
              key={doc.id}
              document={doc}
              isSelected={selectedItems.includes(doc.id)}
              onPress={() => handleOpenDocument(doc)}
              onLongPress={() => toggleSelection(doc.id)}
            />
          )
        )}
      </ScrollView>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="file-search-outline"
            size={64}
            color={Colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>No documents found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filter
          </Text>
        </View>
      )}

      {/* Document Viewer Modal */}
      <Modal
        visible={showViewer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedDocument && (
          <DocumentViewerScreen
            document={{
              id: selectedDocument.id,
              title: selectedDocument.title,
              date: selectedDocument.date,
              pages: selectedDocument.pages,
              type: selectedDocument.type,
              imageUri: selectedDocument.imageUri,
              pageImages: selectedDocument.pageImages,
            }}
            onClose={handleCloseViewer}
            onShare={() => handleShareDocument(selectedDocument)}
            onDelete={() => handleDeleteDocument(selectedDocument)}
            onRename={handleRenameFromViewer}
            onAddPage={handleAddPageFromViewer}
          />
        )}
      </Modal>

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
                    <Text style={styles.actionDocMeta}>{actionTargetDoc.date} • {actionTargetDoc.size}</Text>
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

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.sortOverlay}>
          <Pressable 
            style={styles.sortBackdrop} 
            onPress={() => setShowSortModal(false)}
          />
          <View style={styles.sortSheet}>
            <View style={styles.sortHandle} />
            <Text style={styles.sortTitle}>Sort By</Text>
            
            <View style={styles.sortOptions}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortType === option.key && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortType(option.key);
                    setShowSortModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.sortIconWrapper,
                    sortType === option.key && styles.sortIconWrapperActive,
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={sortType === option.key ? Colors.primary : Colors.textSecondary} 
                    />
                  </View>
                  <Text style={[
                    styles.sortOptionText,
                    sortType === option.key && styles.sortOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                  {sortType === option.key && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
                onPress={() => performConvert('png')}
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
    </SafeAreaView>
  );
}

interface DocumentListItemProps {
  document: DocumentItem;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMorePress: () => void;
}

function DocumentListItem({
  document,
  isSelected,
  onPress,
  onLongPress,
  onMorePress,
}: DocumentListItemProps) {
  return (
    <TouchableOpacity
      style={[styles.listItem, isSelected && styles.listItemSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[
        styles.listItemThumbnail,
        { backgroundColor: document.type === 'pdf' ? '#FEE2E2' : '#DBEAFE' }
      ]}>
        {document.imageUri ? (
          <Image source={{ uri: document.imageUri }} style={styles.thumbnailImage} />
        ) : document.type === 'pdf' ? (
          <MaterialCommunityIcons name="file-pdf-box" size={32} color={Colors.error} />
        ) : (
          <Ionicons name="image" size={32} color={Colors.primary} />
        )}
      </View>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle} numberOfLines={1}>
          {truncateFileName(document.title)}
        </Text>
        <Text style={styles.listItemMeta}>
          {document.date} • {document.size}
        </Text>
        {document.pages > 1 && (
          <Text style={styles.listItemPages}>{document.pages} pages</Text>
        )}
      </View>
      <View style={styles.listItemActions}>
        {isSelected ? (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        ) : (
          <TouchableOpacity onPress={onMorePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface DocumentGridItemProps {
  document: DocumentItem;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function DocumentGridItem({
  document,
  isSelected,
  onPress,
  onLongPress,
}: DocumentGridItemProps) {
  return (
    <TouchableOpacity
      style={[styles.gridItem, isSelected && styles.gridItemSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[
        styles.gridItemThumbnail,
        { backgroundColor: document.type === 'pdf' ? '#FEE2E2' : '#DBEAFE' }
      ]}>
        {document.imageUri ? (
          <Image source={{ uri: document.imageUri }} style={styles.gridThumbnailImage} />
        ) : document.type === 'pdf' ? (
          <MaterialCommunityIcons name="file-pdf-box" size={44} color={Colors.error} />
        ) : (
          <Ionicons name="image" size={44} color={Colors.primary} />
        )}
        {isSelected && (
          <View style={styles.gridCheckmark}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={styles.gridItemTitle} numberOfLines={2}>
        {document.title}
      </Text>
      <Text style={styles.gridItemMeta}>{document.date}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 46,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    padding: 4,
  },
  documentContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 100,
  },
  listItem: {
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
  listItemSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  listItemThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  listItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listItemPages: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  listItemActions: {
    padding: 8,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItem: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  gridItemSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  gridItemThumbnail: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  gridItemMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -50 }],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
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
    paddingBottom: 40,
  },
  actionsHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  actionDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionDocIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionDocImage: {
    width: '100%',
    height: '100%',
  },
  actionDocInfo: {
    flex: 1,
    marginLeft: 14,
  },
  actionDocTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionDocMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionsList: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    fontWeight: '500' as const,
    color: Colors.text,
  },
  actionHorizontalIconDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  actionHorizontalLabelDelete: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  // Sort Modal styles
  sortOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sortBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sortSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sortHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sortTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  sortOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  sortIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sortIconWrapperActive: {
    backgroundColor: '#DBEAFE',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  // Rename Modal styles
  renameOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  renameSheet: {
    width: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
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
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  renameConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
