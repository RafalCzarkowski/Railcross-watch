"""Frame extraction + YOLO label generation from training video assets."""
import os
import cv2
from loguru import logger
from .config import settings
from .analyzer import detector
from .analyzer.models import BBox

FRAME_SKIP = int(os.getenv("EXTRACTION_FRAME_SKIP", "10"))


def _training_root() -> str:
    # uploads_dir = .../storage/uploads/videos → training = .../storage/training
    return os.path.abspath(os.path.join(settings.uploads_dir, "..", "..", "..", "training"))


def extract_frames(asset_id: str, video_path: str) -> tuple[str, int]:
    """Extract frames and generate YOLO label files.

    Returns (frames_dir, frames_count).
    """
    root = _training_root()
    frames_dir = os.path.join(root, "frames", asset_id)
    labels_dir = os.path.join(root, "labels", asset_id)
    os.makedirs(frames_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    frame_idx = 0
    saved = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % FRAME_SKIP == 0:
            frame_name = f"frame_{frame_idx:06d}"
            img_path = os.path.join(frames_dir, f"{frame_name}.jpg")
            lbl_path = os.path.join(labels_dir, f"{frame_name}.txt")

            cv2.imwrite(img_path, frame)
            _write_labels(frame, lbl_path)
            saved += 1

        frame_idx += 1

    cap.release()
    logger.info(f"Extracted {saved} frames for asset {asset_id} → {frames_dir}")
    return frames_dir, saved


def _write_labels(frame: cv2.typing.MatLike, label_path: str) -> None:
    """Run YOLO inference on frame and write YOLO-format label file."""
    boxes: list[BBox] = detector.detect(frame, settings.detection_confidence_threshold)
    with open(label_path, "w") as f:
        for box in boxes:
            class_id = _label_to_class_id(box.label)
            if class_id is None:
                continue
            f.write(f"{class_id} {box.x:.6f} {box.y:.6f} {box.w:.6f} {box.h:.6f}\n")


_LABEL_MAP: dict[str, int] = {
    "pedestrian": 0,
    "bicycle": 1,
    "car": 2,
    "motorcycle": 3,
    "bus": 4,
    "truck": 5,
    "traffic_light_red": 6,
    "traffic_light_green": 7,
    "traffic_light_yellow": 8,
}


def _label_to_class_id(label: str) -> int | None:
    return _LABEL_MAP.get(label)
