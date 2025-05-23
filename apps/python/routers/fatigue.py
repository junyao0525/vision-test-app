# routers/fatigue.py
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import os
import time
from scipy.spatial import distance as dist
from datetime import datetime
from tempfile import NamedTemporaryFile

router = APIRouter(prefix="/fatigue", tags=["Fatigue Analysis"])
UPLOAD_FOLDER = "uploads/fatigue/input"
OUTPUT_FOLDER = "uploads/fatigue/output"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
# Define landmarks
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
LEFT_IRIS = [469, 470, 471, 472]
RIGHT_IRIS = [474, 475, 476, 477]

def calculate_ear(eye_landmarks):
    A = dist.euclidean(eye_landmarks[1], eye_landmarks[5])
    B = dist.euclidean(eye_landmarks[2], eye_landmarks[4])
    C = dist.euclidean(eye_landmarks[0], eye_landmarks[3])
    return (A + B) / (2.0 * C) if C != 0 else 0

def calculate_perclos(ear_values, threshold=0.25):
    closed_frames = sum(ear < threshold for ear in ear_values)
    return closed_frames / len(ear_values) if ear_values else 0

@router.post("/analyze")
async def analyze_fatigue(file: UploadFile = File(...)):
    contents = await file.read()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    # Save the uploaded file to the specified folder
    with open(file_path, "wb") as f:
        f.write(contents)

    # Now you can process the video at the saved file_path
    cap = cv2.VideoCapture(file_path)  # Use the saved file_path here
    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    total_duration = 5
    total_frames = int(frame_rate * total_duration)
    frame_count = 0

    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

    eye_aspect_ratios = []
    saccadic_velocities = []
    blink_count = 0
    blink_threshold = 0.25
    blink_flag = False

    prev_left_iris, prev_right_iris = None, None
    prev_time = None
    start_time = time.time()

    while cap.isOpened() and frame_count < total_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = face_mesh.process(rgb_frame)
        curr_time = time.time() - start_time

        if result.multi_face_landmarks:
            for face_landmarks in result.multi_face_landmarks:
                h, w, _ = frame.shape
                landmarks = [(int(pt.x * w), int(pt.y * h)) for pt in face_landmarks.landmark]

                left_eye = np.array([landmarks[i] for i in LEFT_EYE])
                right_eye = np.array([landmarks[i] for i in RIGHT_EYE])
                left_ear = calculate_ear(left_eye)
                right_ear = calculate_ear(right_eye)
                avg_ear = (left_ear + right_ear) / 2.0
                eye_aspect_ratios.append(avg_ear)

                if avg_ear < blink_threshold and not blink_flag:
                    blink_count += 1
                    blink_flag = True
                elif avg_ear >= blink_threshold:
                    blink_flag = False

                left_iris = np.mean([landmarks[idx] for idx in LEFT_IRIS], axis=0)
                right_iris = np.mean([landmarks[idx] for idx in RIGHT_IRIS], axis=0)

                if prev_left_iris is not None and prev_right_iris is not None and prev_time is not None:
                    time_diff = curr_time - prev_time
                    if time_diff > 0:
                        left_velocity = dist.euclidean(left_iris, prev_left_iris) / time_diff
                        right_velocity = dist.euclidean(right_iris, prev_right_iris) / time_diff
                        avg_velocity = (left_velocity + right_velocity) / 2
                        saccadic_velocities.append(avg_velocity)

                prev_left_iris, prev_right_iris = left_iris, right_iris
                prev_time = curr_time

    cap.release()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    average_ear = np.mean(eye_aspect_ratios)
    perclos = calculate_perclos(eye_aspect_ratios)
    average_saccadic_velocity = np.mean(saccadic_velocities) if saccadic_velocities else 0
    blink_rate = blink_count / (total_duration / 60)
    a = -1.82  # PERCLOS coefficient
    b = -0.0030090013  # Blink Rate coefficient
    c = 1.10  # Saccadic Velocity coefficient
    d = -2.63  # Intercept

    # Calculate logistic score
    logit = a * perclos + b * blink_rate + c * average_saccadic_velocity + d

    # Convert to probability using sigmoid
    prob_non_drowsy = 1 / (1 + np.exp(-logit))
    prob_drowsy = 1 - prob_non_drowsy
    # Classify based on probability threshold (e.g., 0.5)
    if prob_drowsy < 0.2:
        fatigue_status = "Normal"
    elif prob_drowsy < 0.8:
        fatigue_status = "Moderate Fatigue"
    else:
        fatigue_status = "High Fatigue"
    # Save to CSV
    csv_filename = "fatigue_summary.csv"
    summary_df = pd.DataFrame([{
        "Timestamp": timestamp,
        "Average EAR": average_ear,
        "PERCLOS": perclos,
        "Blink Rate (BPM)": blink_rate,
        "Average Saccadic Velocity": average_saccadic_velocity,
        "Fatigue Level": prob_drowsy,
        "Fatigue Status": fatigue_status
    }])
    if not os.path.exists(csv_filename):
        summary_df.to_csv(csv_filename, index=False)
    else:
        summary_df.to_csv(csv_filename, mode='a', header=False, index=False)

    return JSONResponse(content={
        "Timestamp": timestamp,
        "Average EAR": average_ear,
        "PERCLOS": perclos,
        "Blink Rate (BPM)": blink_rate,
        "Average Saccadic Velocity": average_saccadic_velocity,
        "Fatigue Level": fatigue_level,
        "Fatigue Status": fatigue_status
    })
