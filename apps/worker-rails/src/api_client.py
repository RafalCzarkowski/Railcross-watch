import json
import httpx
from loguru import logger
from .config import settings
from .analyzer.models import FrameResult


def _post(url: str, payload: dict) -> None:
    try:
        resp = httpx.post(
            url,
            json=payload,
            headers={"x-internal-secret": settings.api_internal_secret},
            timeout=30,
        )
        resp.raise_for_status()
        logger.info(f"Posted to {url}: {payload.get('status')}")
    except Exception as exc:
        logger.error(f"Failed to post to {url}: {exc}")


def post_result(
    video_id: str,
    status: str,
    results: list[FrameResult] | None = None,
    error: str | None = None,
) -> None:
    url = f"{settings.api_base_url}/internal/videos/{video_id}/analysis-result"
    payload: dict = {"status": status}
    if results is not None:
        payload["detectionsJson"] = json.dumps([r.as_dict() for r in results])
    if error:
        payload["errorMessage"] = error[:1000]
    _post(url, payload)


def post_training_analysis_result(
    asset_id: str,
    status: str,
    detections_json: str | None = None,
    error: str | None = None,
) -> None:
    url = f"{settings.api_base_url}/internal/training-assets/{asset_id}/analysis-result"
    payload: dict = {"status": status}
    if detections_json is not None:
        payload["detectionsJson"] = detections_json
    if error:
        payload["errorMessage"] = error[:1000]
    _post(url, payload)


def post_extraction_result(
    asset_id: str,
    status: str,
    frames_dir: str | None = None,
    frames_count: int | None = None,
    error: str | None = None,
) -> None:
    url = f"{settings.api_base_url}/internal/training-assets/{asset_id}/extraction-result"
    payload: dict = {"status": status}
    if frames_dir is not None:
        payload["framesDir"] = frames_dir
    if frames_count is not None:
        payload["framesCount"] = frames_count
    if error:
        payload["errorMessage"] = error[:1000]
    _post(url, payload)


def post_training_run_result(
    run_id: str,
    status: str,
    model_path: str | None = None,
    metrics: str | None = None,
    error: str | None = None,
) -> None:
    url = f"{settings.api_base_url}/internal/training-runs/{run_id}/result"
    payload: dict = {"status": status}
    if model_path is not None:
        payload["modelPath"] = model_path
    if metrics is not None:
        payload["metrics"] = metrics
    if error:
        payload["errorMsg"] = error[:1000]
    _post(url, payload)
