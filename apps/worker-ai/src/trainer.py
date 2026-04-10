"""YOLO26 fine-tuning on extracted training frames."""
import json
import os
import tempfile
import yaml
from loguru import logger
from .config import settings

CLASS_NAMES = [
    "pedestrian",
    "bicycle",
    "car",
    "motorcycle",
    "bus",
    "truck",
    "traffic_light_red",
    "traffic_light_green",
    "traffic_light_yellow",
]


def run_finetuning(run_id: str, epochs: int = 50) -> tuple[str, str]:
    """Fine-tune YOLO26 on all extracted frames.

    Returns (model_path, metrics_json).
    """
    # uploads_dir = .../storage/uploads/videos → training = .../storage/training
    training_root = os.path.abspath(os.path.join(settings.uploads_dir, "..", "..", "..", "training"))
    frames_root = os.path.join(training_root, "frames")
    labels_root = os.path.join(training_root, "labels")

    asset_ids = [d for d in os.listdir(frames_root) if os.path.isdir(os.path.join(frames_root, d))]
    if not asset_ids:
        raise RuntimeError("No extracted frames found. Run frame extraction first.")

    logger.info(f"Starting fine-tune run {run_id}: {len(asset_ids)} asset(s), {epochs} epochs")

    dataset_yaml = _build_dataset_yaml(frames_root, labels_root, asset_ids, run_id)

    from ultralytics import YOLO
    model = YOLO(settings.yolo_model_path)

    output_dir = os.path.join(training_root, "runs", run_id)
    os.makedirs(output_dir, exist_ok=True)

    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=640,
        project=output_dir,
        name="train",
        exist_ok=True,
    )

    best_model = os.path.join(output_dir, "train", "weights", "best.pt")
    if not os.path.exists(best_model):
        best_model = os.path.join(output_dir, "train", "weights", "last.pt")

    metrics = {}
    if hasattr(results, "results_dict"):
        metrics = {k: float(v) for k, v in results.results_dict.items() if isinstance(v, (int, float))}

    logger.info(f"Fine-tune complete: model={best_model} metrics={metrics}")
    return best_model, json.dumps(metrics)


def _build_dataset_yaml(frames_root: str, labels_root: str, asset_ids: list[str], run_id: str) -> str:
    train_images: list[str] = []
    for asset_id in asset_ids:
        asset_frames = os.path.join(frames_root, asset_id)
        for fname in os.listdir(asset_frames):
            if fname.endswith(".jpg"):
                train_images.append(os.path.join(asset_frames, fname))

    dataset_config = {
        "path": os.path.join(frames_root, ".."),
        "train": train_images,
        "val": train_images[-max(1, len(train_images) // 10):],
        "nc": len(CLASS_NAMES),
        "names": CLASS_NAMES,
    }

    yaml_path = os.path.join(tempfile.gettempdir(), f"railcross_dataset_{run_id}.yaml")
    with open(yaml_path, "w") as f:
        yaml.dump(dataset_config, f)

    return yaml_path
