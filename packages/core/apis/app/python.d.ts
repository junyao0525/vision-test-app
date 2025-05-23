export type DetectFaceApi = {
  Endpoint: "/mediapipe/detect-face/";
  Method: "POST";
  Body: {
    file: FormData;
  };
  Response: {
    timestamp: string;
    face_count: number;
    faces: {
      distance_cm: number;
      pixel_distance: number;
      is_too_near: boolean;
      is_centered: boolean;
      is_too_far: boolean;
    }[];
  };
  Error: ERRORS["notFound"];
};

export type FatigueDetectionApi = {
  Endpoint: "/fatigue/analyze/";
  Method: "POST";
  Body: {
    file: FormData;
  };
  Response: {
    Timestamp: string;
    "Average EAR": number;
    PERCLOS: number;
    "Blink Rate (BPM)": number;
    "Average Saccadic Velocity": number;
    "Fatigue Level": number;
    "Fatigue Status": "Normal" | "Moderate Fatigue" | "High Fatigue (Warning)";
  };
  Error: {
    message: string;
  };
};
