import {useMutation} from '@tanstack/react-query';
import {DetectFaceApi, FatigueDetectionApi} from '@vt/core/apis/app/python';

const API_BASE_URL = 'http://192.168.100.7:8000';
// api/python.ts

export const useDetectFaceAPI = () => {
  return useMutation<
    DetectFaceApi['Response'],
    DetectFaceApi['Error'],
    FormData
  >({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(API_BASE_URL + '/mediapipe/detect-face/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // You can handle specific errors here if needed
        throw new Error('Face detection failed');
      }

      return (await response.json()) as DetectFaceApi['Response'];
    },
  });
};

export const useFatigueDetectionAPI = () => {
  return useMutation<
    FatigueDetectionApi['Response'],
    FatigueDetectionApi['Error'],
    FormData
  >({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(API_BASE_URL + '/fatigue/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fatigue detection failed');
      }

      return (await response.json()) as FatigueDetectionApi['Response'];
    },
  });
};
