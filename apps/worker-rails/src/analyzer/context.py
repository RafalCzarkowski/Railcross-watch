import cv2
import numpy as np


def estimate_time_of_day(frame: np.ndarray) -> str:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())
    if brightness < 50:
        return "night"
    if brightness < 110:
        return "dusk"
    return "day"


def estimate_weather(frame: np.ndarray) -> str:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    brightness = float(hsv[:, :, 2].mean())
    saturation = float(hsv[:, :, 1].mean())
    if brightness < 60:
        return "night"
    if saturation < 25:
        return "rain"
    if brightness > 185:
        return "sunny"
    return "cloudy"


def detect_barrier(frame: np.ndarray) -> str:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    roi = gray[int(h * 0.2): int(h * 0.85), :]
    blurred = cv2.GaussianBlur(roi, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=80,
        minLineLength=int(w * 0.25),
        maxLineGap=30,
    )

    if lines is None:
        return "unknown"

    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 == x1:
            continue
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        if angle < 20 or angle > 160:
            return "down"

    return "up"
