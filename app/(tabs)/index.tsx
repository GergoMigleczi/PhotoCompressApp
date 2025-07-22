import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { router, useFocusEffect } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function CameraPage() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [mediaPermission, setMediaPermission] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [shouldShowCamera, setShouldShowCamera] = useState(true);

  const cameraRef = useRef(null);
  const navigation = router;

  useEffect(() => {
    requestPermissions();
  }, []);

  // Handle screen focus/blur to restart camera
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused - restart camera
      setShouldShowCamera(true);
      setIsCameraReady(false);

      return () => {
        // Screen is unfocused - stop camera
        setShouldShowCamera(false);
      };
    }, [])
  );

  const requestPermissions = async () => {
    try {
      // Request camera permission if not granted
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }

      // Check media library permission
      const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();
      if (mediaStatus !== 'granted') {
        const { status: newMediaStatus } = await MediaLibrary.requestPermissionsAsync();
        setMediaPermission(newMediaStatus === 'granted');
      } else {
        setMediaPermission(true);
      }
    } catch (error) {
      console.error('Permission error:', error);
      setMediaPermission(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: true,
      });

      // Simply save to the main media library
      await MediaLibrary.saveToLibraryAsync(photo.uri);

      // Navigate to gallery or show success message
      Alert.alert('Success', 'Photo saved successfully!', [
        {
          text: 'View Gallery',
          onPress: () => router.push('/gallery'),
        },
        {
          text: 'Take Another',
          style: 'cancel',
        },
      ]);

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };


  const toggleCameraType = () => {
    setCameraType(current =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      switch (current) {
        case 'off':
          return 'on';
        case 'on':
          return 'auto';
        case 'auto':
          return 'off';
        default:
          return 'off';
      }
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on':
        return 'flash';
      case 'auto':
        return 'flash-auto';
      default:
        return 'flash-off';
    }
  };

  if (!cameraPermission || !shouldShowCamera) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted || mediaPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera and media permissions are required
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermissions}>
          <Text style={styles.retryButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        onCameraReady={() => setIsCameraReady(true)}
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleFlash}
          >
            <Ionicons name={getFlashIcon()} size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => router.push('/gallery')}
          >
            <Ionicons name="images" size={30} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.capturingButton]}
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight || 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});