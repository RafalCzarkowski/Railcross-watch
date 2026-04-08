import json
import os
import sys
import redis
from loguru import logger
from .config import settings
from .analyzer import detector, pipeline
from .downloader import get_video_path
from . import api_client
from . import extractor
from . import trainer

QUEUE_KEY = "railcross:queue"


def _handle_analyze_video(job: dict) -> None:
    video_id = job.get("videoId", "?")
    video_path: str | None = None
    is_temp = False
    try:
        video_path, is_temp = get_video_path(job)
        frames = pipeline.analyze(video_path)
        api_client.post_result(video_id, "DONE", results=frames)
    except Exception as exc:
        logger.error(f"Video analysis failed for {video_id}: {exc}")
        api_client.post_result(video_id, "ERROR", error=str(exc))
    finally:
        if is_temp and video_path and os.path.exists(video_path):
            os.remove(video_path)


def _handle_analyze_training(job: dict) -> None:
    asset_id = job.get("assetId", "?")
    file_path = job.get("filePath", "")
    try:
        frames = pipeline.analyze(file_path)
        detections_json = json.dumps([f.as_dict() for f in frames])
        api_client.post_training_analysis_result(asset_id, "DONE", detections_json=detections_json)
    except Exception as exc:
        logger.error(f"Training asset analysis failed for {asset_id}: {exc}")
        api_client.post_training_analysis_result(asset_id, "ERROR", error=str(exc))


def _handle_extract_frames(job: dict) -> None:
    asset_id = job.get("assetId", "?")
    file_path = job.get("filePath", "")
    try:
        frames_dir, frames_count = extractor.extract_frames(asset_id, file_path)
        api_client.post_extraction_result(asset_id, "DONE", frames_dir=frames_dir, frames_count=frames_count)
    except Exception as exc:
        logger.error(f"Frame extraction failed for {asset_id}: {exc}")
        api_client.post_extraction_result(asset_id, "ERROR", error=str(exc))


def _handle_fine_tune(job: dict) -> None:
    run_id = job.get("runId", "?")
    epochs = int(job.get("epochs", 50))
    try:
        model_path, metrics_json = trainer.run_finetuning(run_id, epochs)
        api_client.post_training_run_result(run_id, "DONE", model_path=model_path, metrics=metrics_json)
    except Exception as exc:
        logger.error(f"Fine-tuning failed for run {run_id}: {exc}")
        api_client.post_training_run_result(run_id, "ERROR", error=str(exc))


_HANDLERS = {
    "ANALYZE_TRAINING": _handle_analyze_training,
    "EXTRACT_FRAMES": _handle_extract_frames,
    "FINE_TUNE": _handle_fine_tune,
}


def main() -> None:
    logger.remove()
    logger.add(sys.stderr, format="{time:HH:mm:ss} | {level} | {message}", level="INFO")

    logger.info(f"Loading YOLO model: {settings.yolo_model_path}")
    detector.load_model(settings.yolo_model_path)
    logger.info("Model loaded")

    r = redis.from_url(settings.redis_url, decode_responses=True)
    logger.info(f"Connected to Redis: {settings.redis_url}")
    logger.info("Waiting for jobs...")

    while True:
        result = r.brpop(QUEUE_KEY, timeout=5)
        if result is None:
            continue

        _, raw = result
        try:
            job = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error(f"Invalid job JSON: {exc}")
            continue

        job_type = job.get("type", "")
        logger.info(f"Job received: type={job_type} id={job.get('videoId') or job.get('assetId') or job.get('runId')}")

        if job_type in _HANDLERS:
            _HANDLERS[job_type](job)
        else:
            _handle_analyze_video(job)


if __name__ == "__main__":
    main()
