import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Camera, PhotoFile} from 'react-native-vision-camera';
import CameraProvider, {useCameraContext} from '../../../hocs/CameraProvider';
import {useDetectFaceAPI} from '../../api/python';
import {Colors, TextStyle} from '../../themes';

const MIN_DISTANCE = 21;
const MAX_DISTANCE = 45;

const DistanceMeasure: React.FC = () => {
  const cameraRef = useRef<Camera | null>(null);
  const isActiveRef = useRef<boolean>(true);
  const capturingRef = useRef<boolean>(false);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {loaded, cameraPermission, activeDevice} = useCameraContext();

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [headDistance, setHeadDistance] = useState<number | null>(null);
  const [faceCount, setFaceCount] = useState<number>(0);

  const navigation = useNavigation();
  const {mutateAsync: detectFaceMutateAsync} = useDetectFaceAPI();

  const capturePhoto = async (): Promise<boolean> => {
    if (!cameraRef.current || capturingRef.current || !activeDevice) {
      return false;
    }

    capturingRef.current = true;

    try {
      console.log('Taking photo...');

      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      console.log('Photo captured:', photo.path);

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? photo.path : `file://${photo.path}`,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as Partial<PhotoFile>);

      const response = await detectFaceMutateAsync(formData);

      if (response.faces.length === 0 && response.face_count === 0) {
        Alert.alert('Error', 'No faces detected. Please try again.');
        return false;
      }

      if (response.face_count >= 2) {
        Alert.alert('Error', 'Multiple faces detected. Please try again.');
        return false;
      }

      if (response.face_count !== 0 && response.faces.length > 0) {
        if (!response.faces[0].is_centered) {
          Alert.alert('Error', 'Face is not Center. Please try again.');
          return false;
        }

        setFaceCount(response.face_count);

        if (response.face_count === 1) {
          const distance = response.faces[0].distance_cm;

          if (distance == null) {
            console.error('Distance not found in the response:', response);
            return false;
          }

          console.log('Distance:', distance);
          setHeadDistance(distance);

          if (distance < MIN_DISTANCE) {
            Alert.alert('Too Close', 'Please move farther from the camera');
            return false;
          } else if (distance > MAX_DISTANCE) {
            Alert.alert('Too Far', 'Please move closer to the camera');
            return false;
          } else {
            Alert.alert('Perfect Distance', 'Your distance is ideal!');

            if (captureIntervalRef.current) {
              clearInterval(captureIntervalRef.current);
              captureIntervalRef.current = null;
              console.log('Capture interval cleared - valid distance reached');
            }
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Photo capture/upload error:', error);
      Alert.alert(
        'Error',
        'Failed to capture or process photo. Please try again.',
      );
      return false;
    } finally {
      capturingRef.current = false;
    }
    return false;
  };

  useEffect(() => {
    setIsMeasuring(true);
    let countdownInterval: NodeJS.Timeout | null = null;
    let secondsRemaining = 10;

    const startMeasurement = () => {
      secondsRemaining = 10;
      setIsMeasuring(true);

      const setupCapture = async () => {
        if (cameraPermission === 'denied') {
          handlePermissionDenied();
          return;
        }

        if (
          cameraPermission === 'granted' &&
          cameraRef.current &&
          loaded &&
          activeDevice
        ) {
          const response = await capturePhoto();
          console.log('Initial response', response);

          if (!response) {
            captureIntervalRef.current = setInterval(capturePhoto, 1000);
            console.log('Photo capture interval set up');
          }
        }
      };

      if (countdownInterval) {
        clearInterval(countdownInterval);
      }

      countdownInterval = setInterval(() => {
        secondsRemaining -= 1;
        console.log(`⏱️ Time remaining: ${secondsRemaining}s`);

        if (secondsRemaining <= 0) {
          console.log('⛔ Timeout reached, stopping capture');
          clearInterval(countdownInterval!);
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
          }
          setIsMeasuring(false);

          Alert.alert(
            'Timeout',
            'Measurement session expired. Please try again.',
            [
              {
                text: 'Cancel',
                onPress: () => navigation.goBack(),
                style: 'destructive',
              },
              {
                text: 'Continue',
                onPress: () => {
                  // Restart the process
                  console.log('Restarting measurement...');
                  startMeasurement();
                },
              },
            ],
          );
        }
      }, 1000);

      setupCapture();
    };

    startMeasurement();

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      console.log('Cleanup: All intervals cleared');
    };
  }, [cameraPermission, loaded, activeDevice]);

  const handlePermissionDenied = (): void => {
    Alert.alert(
      'Permission Denied',
      'Camera access is denied. Please enable it in settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  };

  const renderDistanceMessage = (): React.ReactNode => {
    if (headDistance === null) return null;

    let message = '';
    let color = Colors.black;

    if (headDistance < MIN_DISTANCE) {
      message = 'Too close! Please move back.';
      color = Colors.red;
    } else if (headDistance > MAX_DISTANCE) {
      message = 'Too far! Please move closer.';
      color = Colors.orange;
    } else {
      message = 'Perfect distance!';
      color = Colors.green;
    }

    return (
      <View style={styles.distanceMessageContainer}>
        <Text style={[styles.distanceText, {color}]}>{message}</Text>
        <Text style={styles.distanceValue}>
          Distance: {headDistance.toFixed(1)} cm
        </Text>
        {faceCount > 0 && (
          <Text style={styles.faceCountText}>Faces detected: {faceCount}</Text>
        )}
      </View>
    );
  };

  if (!activeDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Front camera not available</Text>
      </SafeAreaView>
    );
  }

  if (cameraPermission !== 'granted') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Camera permission is required.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={[TextStyle.H3, styles.text]}>
          {headDistance === null
            ? 'Hold your device and match your face within the circle and sit in a well-lit room.'
            : 'Distance measured successfully'}
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={activeDevice}
          isActive={isActiveRef.current}
          photo={true}
          onError={error => {
            console.log('Camera initialization error', error);
          }}
        />
        <View style={styles.faceGuide} />
      </View>

      <View style={styles.statusContainer}>
        {isMeasuring && (
          <View style={styles.measureTextContainer}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.measuringText}>Measuring...</Text>
          </View>
        )}
        {renderDistanceMessage()}
      </View>
    </View>
  );
};

const ETDistanceMeasureWithProvider: React.FC = () => {
  return (
    <CameraProvider>
      <DistanceMeasure />
    </CameraProvider>
  );
};

export default ETDistanceMeasureWithProvider;

const styles = StyleSheet.create({
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'lime',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    color: Colors.black,
  },
  cameraContainer: {
    flex: 2, // Ensures the camera takes available space
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  measureTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  measuringText: {
    fontSize: 18,
    color: Colors.black,
  },
  distanceMessageContainer: {
    alignItems: 'center',
    padding: 10,
  },
  distanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  distanceValue: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.black,
  },
  faceCountText: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.black,
    marginTop: 5,
  },
  errorText: {
    fontSize: 18,
    color: Colors.black,
    textAlign: 'center',
    padding: 20,
  },
  faceGuide: {
    position: 'absolute',
    width: 250, // Width of the circle
    height: 300, // Height of the circle (same as width to make it circular)
    borderRadius: 125, // Half of width/height to make it circular
    borderColor: 'white',
    borderWidth: 2,
    borderStyle: 'dashed', // Dotted border
    justifyContent: 'center',
    alignItems: 'center',
  },
});
