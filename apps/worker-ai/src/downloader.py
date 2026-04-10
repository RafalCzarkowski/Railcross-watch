import os
import tempfile
import yt_dlp
from loguru import logger


def get_video_path(job: dict) -> tuple[str, bool]:
    source_type = job.get("sourceType", "FILE")

    if source_type == "FILE":
        path = job.get("filePath")
        if not path or not os.path.exists(path):
            raise FileNotFoundError(f"Video file not found: {path}")
        return path, False

    if source_type == "YOUTUBE":
        url = job["sourceUrl"]
        out = os.path.join(tempfile.gettempdir(), f"{job['videoId']}.mp4")
        logger.info(f"Downloading YouTube video: {url}")
        ydl_opts = {
            "outtmpl": out,
            "format": "best[ext=mp4]/best",
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return out, True

    raise ValueError(f"Unsupported sourceType: {source_type}")
