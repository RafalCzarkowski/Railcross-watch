from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    api_base_url: str = "http://localhost:3001"
    api_internal_secret: str = ""

    yolo_model_path: str = "yolo26n.pt"
    detection_confidence_threshold: float = 0.45
    detection_frame_skip: int = 5

    uploads_dir: str = "../../storage/uploads/videos"

    track_zone_x_min: float = 0.25
    track_zone_x_max: float = 0.75
    track_zone_y_min: float = 0.35


settings = Settings()
