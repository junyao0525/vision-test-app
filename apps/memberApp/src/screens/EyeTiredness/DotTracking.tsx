import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Platform, Alert} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import {useFatigueDetectionAPI} from '../../api/python';
import CameraProvider, {useCameraContext} from '../../../hocs/CameraProvider';
import {SafeAreaView} from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import {Colors} from '../../themes';
import SuccessPage from '../../components/SuccessScreen'; // Import the SuccessPage component

const DURATION_SECONDS = 5;
const FPS = 60;

const DotTracking = () => {
  const cameraRef = useRef<Camera>(null);
  const isActiveRef = useRef<boolean>(true);
  const [frame, setFrame] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showRedDot, setShowRedDot] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false); // Track upload success
  const {loaded, cameraPermission, activeDevice} = useCameraContext();
  const fatigueUpload = useFatigueDetectionAPI();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isCameraReady) {
      setShowRedDot(true);
      startRecording(); // Automatically start recording after countdown
    }
  }, [countdown, isCameraReady]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && activeDevice && loaded && cameraRef.current) {
      interval = setInterval(() => {
        setFrame(prev => {
          const next = prev + 1;
          if (next >= FPS * DURATION_SECONDS) stopRecording();
          return next;
        });
      }, 1000 / FPS);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, loaded, activeDevice]);

  const startRecording = async () => {
    if (isRecording || !cameraRef.current) return;
    setIsRecording(true);
    setFrame(0);

    try {
      await cameraRef.current.startRecording({
        onRecordingFinished: async video => {
          console.log('Video recorded:', video.path);
          uploadVideo(video.path);
        },
        onRecordingError: error => {
          console.error('Recording error:', error);
          Alert.alert('Error', error.message || 'Recording failed.');
        },
        fileType: Platform.OS === 'ios' ? 'mov' : 'mp4',
      });

      setTimeout(() => stopRecording(), DURATION_SECONDS * 1000);
    } catch (err) {
      console.error('Recording start error:', err);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !isRecording) return; // Check if camera is available and recording is in progress

    try {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    } catch (err) {
      console.warn('Error stopping recording:', err);
    }
  };

  const uploadVideo = async (videoPath: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? 'file://' + videoPath : videoPath,
      name: 'video.mp4',
      type: Platform.OS === 'ios' ? 'video/quicktime' : 'video/mp4',
    });

    const response = await fatigueUpload.mutateAsync(formData, {
      onSuccess: data => {
        setIsUploadSuccess(true); // Set success state to true
        const message = `
        Timestamp: ${data['Timestamp']}
        Average EAR: ${data['Average EAR'].toFixed(3)}
        PERCLOS: ${data['PERCLOS'].toFixed(2)}%
        Blink Rate (BPM): ${data['Blink Rate (BPM)'].toFixed(2)}
        Average Saccadic Velocity: ${data['Average Saccadic Velocity'].toFixed(
          2,
        )}
        Fatigue Level: ${data['Fatigue Level']}
    `;
        Alert.alert('Fatigue Status', `${data['Fatigue Status']}\n${message}`);
      },
      onError: error => {
        setIsUploadSuccess(false); // Set success state to false
        Alert.alert('Error', error.message || 'Upload failed.');
      },
    });
    console.log(response);
  };

  const handleCameraInitialized = () => {
    setIsCameraReady(true);
  };

  if (!activeDevice || cameraPermission !== 'granted') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>
          {cameraPermission !== 'granted'
            ? 'Camera permission is required.'
            : 'Front camera not available'}
        </Text>
      </SafeAreaView>
    );
  }

  // Render SuccessPage after upload success
  if (isUploadSuccess) {
    return (
      <SuccessPage
        successMessage="Video uploaded successfully! Your fatigue status has been analyzed."
        targetScreen="HomeScreen" // Redirect to HomeScreen after success
      />
    );
  }

  return (
    <View style={styles.container}>
      {countdown > 0 ? (
        <View
          style={[
            styles.countdownContainer,
            {backgroundColor: Colors.backgroundColor},
          ]}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={activeDevice}
            isActive={isActiveRef.current}
            video={true}
            audio={false}
            onInitialized={handleCameraInitialized}
          />
          {showRedDot && (
            <View style={styles.redDotContainer}>
              <Text style={styles.hintText}>
                Follow the red dot with your eyes
              </Text>
              <FastImage
                source={require('../../../assets/images/dot_tracking.gif')}
                style={styles.gif}
              />
            </View>
          )}
          <Text style={styles.timerText}>
            {Math.min(parseFloat((frame / FPS).toFixed(1)), DURATION_SECONDS)}s
            / {DURATION_SECONDS}s
          </Text>
        </>
      )}
    </View>
  );
};

const DotTrackingWithProvider: React.FC = () => {
  return (
    <CameraProvider>
      <DotTracking />
    </CameraProvider>
  );
};

export default DotTrackingWithProvider;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundColor,
  },
  camera: {width: '100%', height: '100%', position: 'absolute', opacity: 0},
  timerText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 20,
    color: Colors.black,
  },
  errorText: {
    fontSize: 18,
    color: Colors.black,
    textAlign: 'center',
    padding: 20,
  },
  countdownContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: Colors.black,
    position: 'absolute',
    top: '40%',
  },
  redDotContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.black,
    marginTop: 5,
  },
  gif: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    marginBottom: 20,
  },
});
