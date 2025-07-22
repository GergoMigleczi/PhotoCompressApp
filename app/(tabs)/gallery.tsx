import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import ImageZoom from 'react-native-image-pan-zoom';

const { width, height } = Dimensions.get('window');

export default function GalleryPage() {
  const [lastImage, setLastImage] = useState(null);
  const [compressedVersions, setCompressedVersions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState('original');

  useEffect(() => {
    loadLastImage();
  }, []);

  const loadLastImage = async () => {
    try {
      setLoading(true);

      // Check permissions
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library access is needed to view images.');
        setLoading(false);
        return;
      }

      // Get the most recent image from the main library
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: 'modificationTime',
        first: 20,
      });

      if (media.assets.length > 0) {
        const sorted = media.assets.sort((a, b) => b.modificationTime - a.modificationTime);
        console.log('Media');
        console.log(sorted);
        const latestImage = sorted[0];
        const assetInfo = await MediaLibrary.getAssetInfoAsync(latestImage);
        setLastImage({ ...latestImage, uri: assetInfo.localUri || assetInfo.uri });
        await generateCompressedVersions(assetInfo.localUri || assetInfo.uri);
      }
    } catch (error) {
      console.error('Error loading image:', error);
      Alert.alert('Error', 'Failed to load the last image.');
    } finally {
      setLoading(false);
    }
  };

  const generateCompressedVersions = async (uri) => {
    try {
      const versions = {};

    // Get original file info
    const originalInfo = await manipulateAsync(uri, [], {
      compress: 1,
      format: SaveFormat.JPEG,
    });
    const originalWidth = originalInfo.width;
    const originalHeight = originalInfo.height;
    const originalFile = await FileSystem.getInfoAsync(uri);
    const originalSize = originalFile.size;
    // Save original size in compressedVersions
    versions['original'] = {
      uri: uri,
      size: originalSize,
      width: originalWidth,
      height: originalHeight
    };
    console.log(originalWidth, originalSize);
      // Generate different quality versions
      const qualities = [
        { key: 'high', compress: 0.8, width: originalWidth * 0.8 },
        { key: 'medium', compress: 0.8, width: originalWidth * 0.6 },
        { key: 'low', compress: 0.9, width: originalWidth * 0.4 },
        { key: 'low1', compress: 0.8, width: originalWidth * 0.4 },
        { key: 'low2', compress: 0.7, width: originalWidth * 0.4 },
        { key: 'low3', compress: 0.6, width: originalWidth * 0.4 },
        { key: 'low4', compress: 0, width: originalWidth * 0.4 },
      ];

      for (const quality of qualities) {
        const result = await manipulateAsync(
          uri,
          [{ resize: { width: quality.width } }],
          {
            compress: quality.compress,
            format: SaveFormat.JPEG,
          }
        );
        const info = await FileSystem.getInfoAsync(result.uri);

        versions[quality.key] = {
            uri: result.uri,
            size: info.size,
            width: result.width,
            height: result.height
        };
      }

      setCompressedVersions(versions);
    } catch (error) {
      console.error('Error compressing images:', error);
    }
  };

  const getImageSource = () => {
    const entry = selectedQuality === 'original'
      ? compressedVersions['original']
      : compressedVersions[selectedQuality];

    return entry ? { uri: entry.uri } : null;
  };

  const getImageSizeText = () => {
    const entry = compressedVersions[selectedQuality];
    if (!entry || !entry.size) return '';

    const sizeKB = entry.size / 1024;
    const sizeMB = sizeKB / 1024;
    return sizeMB >= 1
      ? `${sizeMB.toFixed(2)} MB`
      : `${sizeKB.toFixed(2)} KB`;
  };

  const getImageWidth = () => {
      const entry = compressedVersions[selectedQuality];
      if (!entry || !entry.width) return '';
      console.log('Image Width: ', entry.width)
      return entry.width;
    };

    const getImageHeight = () => {
        const entry = compressedVersions[selectedQuality];
        if (!entry || !entry.height) return '';
        console.log('Image Height: ', entry.height)
        return entry.height;
    };

  const getCompressionPercentage = () => {
    const original = compressedVersions['original'];
    const current = compressedVersions[selectedQuality];
    if (!original || !current || selectedQuality === 'original') return '';

    const ratio = (current.size / original.size) * 100;
    return `${ratio.toFixed(1)}% of original size`;
  };

  const getQualityInfo = () => {
    switch (selectedQuality) {
      case 'original':
        return 'Original Quality';
      case 'high':
        return 'High Quality ';
      case 'medium':
        return 'Medium Quality';
      case 'low':
        return 'Low Quality';
      case 'low1':
        return 'Low1';
    case 'low2':
        return 'Low2';
    case 'low3':
        return 'Low3';
    case 'low4':
        return 'Low4';
      default:
        return '';
    }
  };

  const deleteImage = () => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image from your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (lastImage) {
                await MediaLibrary.deleteAssetsAsync([lastImage.id]);
                setLastImage(null);
                setCompressedVersions({});
                Alert.alert('Deleted', 'Image has been deleted successfully.');
              }
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', 'Failed to delete the image.');
            }
          },
        },
      ]
    );
  };

  const saveImage = async () => {
    const entry = compressedVersions[selectedQuality];
    if (!entry || !entry.uri);

    try{
        // Simply save to the main media library

          await MediaLibrary.saveToLibraryAsync(entry.uri);

          // Navigate to gallery or show success message
          Alert.alert('Success', 'Photo saved successfully!', [
          ]);

        } catch (error) {
          console.error('Error saving picture:', error);
          Alert.alert('Error', 'Failed to save picture. Please try again.');
        }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading gallery...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Gallery</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="camera" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {lastImage ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Image Display */}
          <View style={styles.imageContainer}>
            <ImageZoom
                cropWidth={width - 50}
                cropHeight={height * 0.5}
                imageWidth={getImageWidth()}
                imageHeight={getImageHeight()}
                enableCenterFocus={false}
                minScale={Math.min(width - 50 / getImageWidth(), height * 0.5 / getImageHeight())}
                maxScale={3}
                panToMove={true}
                pinchToZoom={true}
            >i
                <Image
                  source={getImageSource()}
                  style={{ width: getImageWidth(), height: getImageHeight() }}
                  resizeMode="contain"
                />
            </ImageZoom>

            {/* Image Info */}
            <View style={styles.imageInfo}>
              <Text style={styles.qualityText}>{getQualityInfo()}</Text>
              <Text style={styles.dateText}>{getImageSizeText()}</Text>
              {selectedQuality !== 'original' && (
                <Text style={styles.dateText}>{getCompressionPercentage()}</Text>
              )}
            </View>
          </View>

          {/* Quality Selector */}
          <View style={styles.qualitySelector}>
            <Text style={styles.sectionTitle}>Image Quality</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['original', 'high', 'medium', 'low', 'low1', 'low2', 'low3', 'low4'].map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[
                    styles.qualityButton,
                    selectedQuality === quality && styles.qualityButtonActive
                  ]}
                  onPress={() => setSelectedQuality(quality)}
                >
                  <Text style={[
                    styles.qualityButtonText,
                    selectedQuality === quality && styles.qualityButtonTextActive
                  ]}>
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={loadLastImage}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={deleteImage}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={saveImage}
            >
              <Ionicons name="download" size={20} color="green" />
              <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color="#999" />
          <Text style={styles.emptyTitle}>No Images</Text>
          <Text style={styles.emptyDescription}>
            Take your first photo to see it here
          </Text>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.cameraButtonText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    padding: 16,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 8,
  },
  imageInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  qualitySelector: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  qualityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  qualityButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  qualityButtonTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  deleteButton: {
    borderColor: '#FF3B30',
  },
  saveButton: {
      borderColor: 'green',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  saveButtonText: {
        color: 'green',
    },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  cameraButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});