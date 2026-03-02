import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AccountScreen from '../screens/AccountScreen';
import CameraScreen from '../screens/CameraScreen';
import PassportCameraScreen from '../screens/PassportCameraScreen';
import PreviewScreen from '../screens/PreviewScreen';
import { pickImageFromGallery } from '../services/imageService';
import { Colors } from '../constants/colors';
import { useSubscription } from '../contexts/SubscriptionContext';

const Tab = createBottomTabNavigator();

const STORAGE_KEY_DOCUMENTS = '@docify_documents';

export interface ScannedDocument {
  id: string;
  title: string;
  date: string;
  pages: number;
  icon: 'receipt-outline' | 'document-text-outline' | 'card-outline' | 'image-outline';
  type: 'pdf';
  imageUri: string;
  pageImages?: string[];
}

interface TabNavigatorProps {
  onUpgrade?: () => void;
}

export default function TabNavigator({ onUpgrade }: TabNavigatorProps) {
  const insets = useSafeAreaInsets();
  const { canScan, showUpgrade, recordScan, isPremium } = useSubscription();
  const [showCamera, setShowCamera] = useState(false);
  const [showPassportCamera, setShowPassportCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [isAddingPage, setIsAddingPage] = useState(false);
  const addPageCaptureCallbackRef = useRef<((uri: string) => void) | null>(null);
  const documentsLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCUMENTS);
        if (cancelled) return;
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScannedDocuments(parsed);
        }
      } catch (_e) {
        // ignore parse/load errors
      } finally {
        if (!cancelled) documentsLoadedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!documentsLoadedRef.current) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(scannedDocuments));
      } catch (_e) {
        // ignore save errors
      }
    })();
  }, [scannedDocuments]);

  const handleOpenCamera = () => {
    if (!canScan()) {
      showUpgrade('daily_limit');
      return;
    }
    setShowCamera(true);
  };

  const openCameraForAddPage = (callback: (uri: string) => void) => {
    if (!isPremium) {
      showUpgrade('add_page');
      return;
    }
    addPageCaptureCallbackRef.current = callback;
    setShowCamera(true);
  };

  const updateDocumentPages = (docId: string, pageImages: string[]) => {
    setScannedDocuments(prev => prev.map(doc =>
      doc.id === docId
        ? { ...doc, pageImages, pages: pageImages.length, imageUri: pageImages.length > 0 ? pageImages[0] : doc.imageUri }
        : doc
    ));
  };

  const handleOpenPassportCamera = () => {
    if (!canScan()) {
      showUpgrade('daily_limit');
      return;
    }
    setShowPassportCamera(true);
  };

  const handleImportFromGallery = async () => {
    const image = await pickImageFromGallery();
    if (!image) return;
    try {
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        [],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (result?.uri) {
        const dir = `${FileSystem.documentDirectory}gallery/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dest = `${dir}img_${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: result.uri, to: dest });
        setCapturedImage(dest);
        setPreviewPages([dest]);
      } else {
        setCapturedImage(image.uri);
        setPreviewPages([image.uri]);
      }
    } catch {
      setCapturedImage(image.uri);
      setPreviewPages([image.uri]);
    }
  };

  const handleOpenGalleryFromCamera = async () => {
    const image = await pickImageFromGallery();
    if (!image) return;
    setShowCamera(false);
    setShowPassportCamera(false);
    const destUri = (async () => {
      try {
        const result = await ImageManipulator.manipulateAsync(
          image.uri,
          [],
          { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (result?.uri) {
          const dir = `${FileSystem.documentDirectory}gallery/`;
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          const dest = `${dir}img_${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: result.uri, to: dest });
          return dest;
        }
      } catch {
        // fall through
      }
      return image.uri;
    })();
    const dest = await destUri;
    if (addPageCaptureCallbackRef.current) {
      addPageCaptureCallbackRef.current(dest);
      addPageCaptureCallbackRef.current = null;
      return;
    }
    if (isAddingPage) {
      setPreviewPages(prev => (prev.length > 0 ? [...prev, dest] : [dest]));
      setCapturedImage(dest);
      setIsAddingPage(false);
    } else {
      setCapturedImage(dest);
      setPreviewPages([dest]);
    }
  };

  const handleImportFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        if (file.mimeType?.startsWith('image/')) {
          try {
            const dir = `${FileSystem.documentDirectory}files/`;
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
            const dest = `${dir}file_${Date.now()}.jpg`;
            await FileSystem.copyAsync({ from: file.uri, to: dest });
            setCapturedImage(dest);
          } catch {
            setCapturedImage(file.uri);
          }
        } else {
          const newDocument: ScannedDocument = {
            id: Date.now().toString(),
            title: file.name || `Document_${new Date().toISOString().split('T')[0]}.pdf`,
            date: formatDate(new Date()),
            pages: 1,
            icon: 'document-text-outline',
            type: 'pdf',
            imageUri: file.uri,
          };
          setScannedDocuments(prev => [newDocument, ...prev]);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking document:', error);
    }
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
    addPageCaptureCallbackRef.current = null;
  };

  const handleClosePassportCamera = () => {
    setShowPassportCamera(false);
  };

  const handleCapture = async (uri: string) => {
    setShowCamera(false);
    let persistentUri = uri;
    try {
      const dir = `${FileSystem.documentDirectory}captures/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}cap_${Date.now()}.jpg`;
      const from = uri.startsWith('file://') ? uri : (uri.startsWith('/') ? `file://${uri}` : uri);
      await FileSystem.copyAsync({ from, to: dest });
      persistentUri = dest;
    } catch {
      // keep original uri if copy fails
    }
    if (addPageCaptureCallbackRef.current) {
      addPageCaptureCallbackRef.current(persistentUri);
      addPageCaptureCallbackRef.current = null;
      return;
    }
    if (isAddingPage) {
      const newPages = [...previewPages, persistentUri];
      setPreviewPages(newPages);
      setCapturedImage(newPages[0]);
      setIsAddingPage(false);
    } else {
      setCapturedImage(persistentUri);
      setPreviewPages([persistentUri]);
    }
  };

  const handlePassportCapture = async (uri: string) => {
    setShowPassportCamera(false);
    let persistentUri = uri;
    try {
      const dir = `${FileSystem.documentDirectory}captures/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}pass_${Date.now()}.jpg`;
      const from = uri.startsWith('file://') ? uri : (uri.startsWith('/') ? `file://${uri}` : uri);
      await FileSystem.copyAsync({ from, to: dest });
      persistentUri = dest;
    } catch {
      // keep original
    }
    setCapturedImage(persistentUri);
    setPreviewPages([persistentUri]);
  };

  const handleClosePreview = () => {
    setCapturedImage(null);
    setPreviewPages([]);
    setIsAddingPage(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPreviewPages([]);
    setIsAddingPage(false);
    setShowCamera(true);
  };

  const handleAddPage = () => {
    if (!isPremium) {
      setCapturedImage(null);
      setPreviewPages([]);
      setIsAddingPage(false);
      showUpgrade('add_page');
      return;
    }
    setIsAddingPage(true);
    setCapturedImage(null);
    setShowCamera(true);
  };

  const handleUpdatePages = (newPages: string[]) => {
    setPreviewPages(newPages);
    if (newPages.length > 0) {
      setCapturedImage(newPages[0]);
    }
  };

  const handleSaveDocument = async (data: { uri: string; name: string; format?: string; pageUris?: string[] }) => {
    if (!canScan()) {
      showUpgrade('daily_limit');
      return;
    }
    const format = data.format || 'pdf';
    const isPdf = format === 'pdf';
    
    let title = data.name || `Scan_${new Date().toISOString().slice(0, 10)}`;
    title = title.replace(/\.(pdf|jpg|jpeg|png)$/i, '');
    title = `${title}.${format}`;
    
    const docId = Date.now().toString();
    const pageUris = (data.pageUris && data.pageUris.length > 0)
      ? data.pageUris
      : previewPages.length > 0
        ? [...previewPages]
        : [data.uri];
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    if (!baseDir) {
      Alert.alert('Error', 'Could not access storage.');
      return;
    }
    const dir = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;

    const persistedUris: string[] = [];
    for (let i = 0; i < pageUris.length; i++) {
      const uri = pageUris[i];
      if (!uri) continue;
      const dest = `${dir}doc_${docId}_${i}.jpg`;
      try {
        const from = uri.startsWith('file://') || uri.startsWith('content://') ? uri : (uri.startsWith('/') ? `file://${uri}` : uri);
        await FileSystem.copyAsync({ from, to: dest });
        persistedUris.push(dest);
      } catch {
        try {
          const result = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
          );
          if (result.uri) {
            await FileSystem.copyAsync({ from: result.uri, to: dest });
            persistedUris.push(dest);
          }
        } catch {
          persistedUris.push(uri);
        }
      }
    }

    if (persistedUris.length === 0) {
      Alert.alert('Error', 'Could not save images. Please try again.');
      return;
    }

    const newDocument: ScannedDocument = {
      id: docId,
      title,
      date: formatDate(new Date()),
      pages: persistedUris.length,
      icon: isPdf ? 'document-text-outline' : 'image-outline',
      type: 'pdf',
      imageUri: persistedUris[0],
      pageImages: persistedUris,
    };
    
    setScannedDocuments(prev => [newDocument, ...prev]);
    setCapturedImage(null);
    setPreviewPages([]);
    await recordScan();
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setScannedDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleRenameDocument = (docId: string, newTitle: string) => {
    setScannedDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, title: newTitle } : doc
    ));
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56 + insets.bottom,
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarActiveTintColor: '#9359FF',
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500' as const,
            marginBottom: 4,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        >
          {() => (
            <DashboardScreen
              scannedDocuments={scannedDocuments}
              onDeleteDocument={handleDeleteDocument}
              onRenameDocument={handleRenameDocument}
              onOpenCamera={handleOpenCamera}
              onOpenPassportCamera={handleOpenPassportCamera}
              onOpenGallery={handleImportFromGallery}
              onOpenFiles={handleImportFromFiles}
              openCameraForAddPage={openCameraForAddPage}
              onUpdateDocumentPages={updateDocumentPages}
              onUpgrade={onUpgrade}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="History"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        >
          {() => (
            <HistoryScreen
              scannedDocuments={scannedDocuments}
              onDeleteDocument={handleDeleteDocument}
              openCameraForAddPage={openCameraForAddPage}
              onUpdateDocumentPages={updateDocumentPages}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Account"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        >
          {() => <AccountScreen onUpgrade={onUpgrade} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CameraScreen
          onClose={handleCloseCamera}
          onCapture={handleCapture}
          onOpenGallery={handleOpenGalleryFromCamera}
        />
      </Modal>

      {/* Passport Camera Modal */}
      <Modal
        visible={showPassportCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PassportCameraScreen
          onClose={handleClosePassportCamera}
          onCapture={handlePassportCapture}
          onOpenGallery={handleOpenGalleryFromCamera}
        />
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={!!capturedImage}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {capturedImage && (
          <PreviewScreen
            imageUri={capturedImage}
            onClose={handleClosePreview}
            onSave={handleSaveDocument}
            onRetake={handleRetake}
            onUpgrade={onUpgrade}
            initialPages={previewPages}
            onAddPage={handleAddPage}
            onUpdatePages={handleUpdatePages}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
