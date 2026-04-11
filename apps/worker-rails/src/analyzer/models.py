from dataclasses import dataclass, field


@dataclass
class BBox:
    label: str
    x: float
    y: float
    w: float
    h: float
    conf: float
    track_id: int | None = None
    velocity: float = 0.0

    def as_dict(self) -> dict:
        return {
            "label": self.label,
            "x": round(self.x, 4),
            "y": round(self.y, 4),
            "w": round(self.w, 4),
            "h": round(self.h, 4),
            "conf": round(self.conf, 3),
            "velocity": round(self.velocity, 4),
        }


VIOLATION_TYPES = {
    "BARRIER_VIOLATION",
    "RED_LIGHT_VIOLATION",
    "PEDESTRIAN_ON_TRACKS",
    "CYCLIST_ON_TRACKS",
    "STALLED_ON_TRACKS",
    "BARRIER_CLOSING_VIOLATION",
}


@dataclass
class FrameResult:
    frameIndex: int
    timestampMs: float
    violation: str | None
    boxes: list[BBox]
    weather: str
    timeOfDay: str
    barrierState: str

    def as_dict(self) -> dict:
        return {
            "frameIndex": self.frameIndex,
            "timestampMs": round(self.timestampMs, 1),
            "violation": self.violation,
            "boxes": [b.as_dict() for b in self.boxes],
            "weather": self.weather,
            "timeOfDay": self.timeOfDay,
            "barrierState": self.barrierState,
        }
