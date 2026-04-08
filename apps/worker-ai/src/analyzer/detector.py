import cv2
import numpy as np
from ultralytics import YOLO
from .models import BBox

COCO_LABELS = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    9: "traffic_light",
}

VEHICLE_LABELS = {"car", "truck", "bus", "motorcycle"}

_model: YOLO | None = None


def load_model(path: str) -> None:
    global _model
    _model = YOLO(path)


def detect(frame: np.ndarray, conf_threshold: float = 0.45) -> list[BBox]:
    if _model is None:
        raise RuntimeError("Model not loaded — call load_model() first")

    results = _model(frame, verbose=False)[0]
    boxes: list[BBox] = []
    h, w = frame.shape[:2]

    for box in results.boxes:
        cls_id = int(box.cls[0])
        if cls_id not in COCO_LABELS:
            continue
        label = COCO_LABELS[cls_id]
        conf = float(box.conf[0])
        if conf < conf_threshold:
            continue

        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = (x1 + x2) / 2 / w
        cy = (y1 + y2) / 2 / h
        bw = (x2 - x1) / w
        bh = (y2 - y1) / h

        if label == "traffic_light":
            label = _classify_light_color(frame, int(x1), int(y1), int(x2), int(y2))

        boxes.append(BBox(label=label, x=cx, y=cy, w=bw, h=bh, conf=conf))

    return boxes


def _classify_light_color(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> str:
    roi = frame[max(0, y1):y2, max(0, x1):x2]
    if roi.size == 0:
        return "traffic_light"
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    red1 = cv2.inRange(hsv, np.array([0, 120, 70]), np.array([10, 255, 255]))
    red2 = cv2.inRange(hsv, np.array([170, 120, 70]), np.array([180, 255, 255]))
    green = cv2.inRange(hsv, np.array([40, 80, 70]), np.array([90, 255, 255]))
    yellow = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([35, 255, 255]))

    counts = {
        "traffic_light_red": cv2.countNonZero(red1) + cv2.countNonZero(red2),
        "traffic_light_green": cv2.countNonZero(green),
        "traffic_light_yellow": cv2.countNonZero(yellow),
    }
    best = max(counts, key=lambda k: counts[k])
    return best if counts[best] > 20 else "traffic_light"
