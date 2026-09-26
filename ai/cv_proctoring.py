"""
HireLens Computer Vision Proctoring Subsystem (Phase 8).
Complies with Sections 93–102, 115 of the Master Build Specification and docs/proctoring.md.

Responsibilities:
- Face presence detection (FACE_MISSING if 0 faces detected)
- Multi-face detection (MULTIPLE_FACES if >= 2 faces detected)
- Prohibited object detection (OBJECT_DETECTED for mobile phones/tablets)
- Edge / Server-side frame processing with confidence scoring
"""

import base64
import io
import logging
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("hirelens.ai.cv_proctoring")


class VisionProctorML:
    """
    Computer Vision model runner for proctoring telemetry.
    Uses Haar Cascades and aspect ratio / luminosity contour analysis for edge/server frame verification.
    """

    _face_cascade = None
    _profile_cascade = None

    @classmethod
    def _get_cascades(cls):
        if cls._face_cascade is None:
            model_path = "/home/manoj/Documents/HireLens/ai/models/haarcascade_frontalface_default.xml"
            cls._face_cascade = cv2.CascadeClassifier(model_path)
        return cls._face_cascade

    @classmethod
    def decode_image(cls, image_data: bytes) -> Optional[np.ndarray]:
        """Decode raw image bytes to an OpenCV BGR numpy array."""
        try:
            pil_img = Image.open(io.BytesIO(image_data)).convert("RGB")
            cv_img = np.array(pil_img)
            # RGB to BGR for OpenCV
            return cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to decode image bytes: {e}")
            return None

    @classmethod
    def decode_base64_image(cls, b64_str: str) -> Optional[np.ndarray]:
        """Decode a base64 data URI or raw base64 string to an OpenCV image."""
        try:
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            raw_bytes = base64.b64decode(b64_str)
            return cls.decode_image(raw_bytes)
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None

    @classmethod
    def detect_faces(cls, image: np.ndarray) -> List[Dict]:
        """
        Detect human faces in the frame using frontal cascade.
        Returns list of bounding boxes with coordinates and confidence.
        """
        face_cascade = cls._get_cascades()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        # Frontal faces
        frontal_faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        detected = []
        for (x, y, w, h) in frontal_faces:
            detected.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "confidence": 0.92,
                "orientation": "frontal",
            })

        return detected

    @classmethod
    def detect_prohibited_devices(cls, image: np.ndarray) -> List[Dict]:
        """
        Detect prohibited electronic devices (smartphones, tablets)
        using aspect-ratio, edge contours, and luminosity analysis.
        Mobile devices in landscape/portrait exhibit characteristic aspect ratios (1.8-2.2:1).
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)

        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        height, width = image.shape[:2]
        frame_area = height * width

        detected_devices = []
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.04 * peri, True)

            # Looking for 4-point rectangular objects
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                area = w * h

                # Filter by reasonable screen sizes relative to frame (2% to 35% of frame)
                if 0.02 * frame_area < area < 0.35 * frame_area:
                    aspect_ratio = float(w) / h if h > 0 else 0
                    # Smartphones typically have aspect ratios ~ 16:9 (1.77) or 19.5:9 (2.16), or inverted
                    is_phone_aspect = (1.5 <= aspect_ratio <= 2.3) or (0.43 <= aspect_ratio <= 0.67)

                    if is_phone_aspect:
                        # Extract ROI to check for screen-like illuminated or uniform surface
                        roi = gray[y:y+h, x:x+w]
                        if roi.size > 0:
                            std_dev = np.std(roi)
                            mean_val = np.mean(roi)
                            # Screens typically have uniform regions or bright display emission
                            if std_dev > 15 and mean_val > 40:
                                detected_devices.append({
                                    "label": "mobile_phone",
                                    "confidence": 0.85,
                                    "box": [int(x), int(y), int(w), int(h)],
                                })
                                # Return first high-confidence device
                                break

        return detected_devices

    @classmethod
    def analyze_frame(cls, image_bytes: bytes) -> Dict:
        """
        Full computer vision frame analysis.
        Returns detection counts, bounding boxes, and triggered incident type if any.
        """
        cv_img = cls.decode_image(image_bytes)
        if cv_img is None:
            return {
                "success": False,
                "error": "Failed to decode frame image.",
                "face_count": 0,
                "faces": [],
                "prohibited_objects": [],
                "incident_type": None,
            }

        faces = cls.detect_faces(cv_img)
        devices = cls.detect_prohibited_devices(cv_img)
        face_count = len(faces)

        incident_type = None
        severity = None
        description = None

        if len(devices) > 0:
            incident_type = "OBJECT_DETECTED"
            severity = "HIGH"
            description = f"Prohibited device ({devices[0]['label']}) detected in camera view."
        elif face_count == 0:
            incident_type = "FACE_MISSING"
            severity = "HIGH"
            description = "Candidate face missing from assessment view."
        elif face_count > 1:
            incident_type = "MULTIPLE_FACES"
            severity = "HIGH"
            description = f"Multiple faces ({face_count}) detected in assessment view."

        return {
            "success": True,
            "face_count": face_count,
            "faces": faces,
            "prohibited_objects": devices,
            "incident_type": incident_type,
            "severity": severity,
            "description": description,
            "verified_normal": (face_count == 1 and len(devices) == 0),
        }

    @classmethod
    def analyze_base64_frame(cls, b64_str: str) -> Dict:
        """Analyze a base64 encoded frame."""
        cv_img = cls.decode_base64_image(b64_str)
        if cv_img is None:
            return {
                "success": False,
                "error": "Failed to decode base64 frame.",
                "face_count": 0,
                "faces": [],
                "prohibited_objects": [],
                "incident_type": None,
            }

        # Convert cv_img to jpeg bytes and pass to analyze_frame
        _, buffer = cv2.imencode(".jpg", cv_img)
        return cls.analyze_frame(buffer.tobytes())
