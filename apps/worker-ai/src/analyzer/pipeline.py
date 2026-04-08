import os
import cv2
from loguru import logger
from . import detector, context, safety
from .models import FrameResult
from .tracker import CentroidTracker

FRAME_SKIP = int(os.getenv("DETECTION_FRAME_SKIP", "5"))
CONF_THRESHOLD = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.45"))


def analyze(video_path: str) -> list[FrameResult]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Analyzing {video_path} | {total} frames @ {fps:.1f} fps | skip={FRAME_SKIP}")

    tracker = CentroidTracker()
    results: list[FrameResult] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % FRAME_SKIP == 0:
            boxes = detector.detect(frame, CONF_THRESHOLD)
            tracked = tracker.update(boxes)
            barrier = context.detect_barrier(frame)
            weather = context.estimate_weather(frame)
            time_of_day = context.estimate_time_of_day(frame)
            violation = safety.evaluate(tracked, barrier, tracker)

            results.append(FrameResult(
                frameIndex=frame_idx,
                timestampMs=(frame_idx / fps) * 1000.0,
                violation=violation,
                boxes=tracked,
                weather=weather,
                timeOfDay=time_of_day,
                barrierState=barrier,
            ))

        frame_idx += 1

    cap.release()
    logger.info(f"Done: {len(results)} frames processed, {sum(1 for r in results if r.violation)} violations")
    return results
