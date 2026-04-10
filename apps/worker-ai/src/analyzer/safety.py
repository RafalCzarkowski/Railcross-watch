from .models import BBox
from .tracker import CentroidTracker, SPEED_THRESHOLD
from ..config import settings

VEHICLE_LABELS = {"car", "truck", "bus", "motorcycle"}
PEDESTRIAN_LABELS = {"person"}
CYCLIST_LABELS = {"bicycle"}
RED_LABELS = {"traffic_light_red"}
GREEN_LABELS = {"traffic_light_green"}


def _in_track_zone(box: BBox) -> bool:
    return (
        settings.track_zone_x_min <= box.x <= settings.track_zone_x_max
        and box.y >= settings.track_zone_y_min
    )


def evaluate(
    boxes: list[BBox],
    barrier_state: str,
    tracker: CentroidTracker,
    prev_barrier_state: str = "unknown",
) -> str | None:
    has_red = any(b.label in RED_LABELS for b in boxes)
    vehicles = [b for b in boxes if b.label in VEHICLE_LABELS]
    pedestrians = [b for b in boxes if b.label in PEDESTRIAN_LABELS]
    cyclists = [b for b in boxes if b.label in CYCLIST_LABELS]

    barrier_just_closed = prev_barrier_state == "up" and barrier_state == "down"

    for v in vehicles:
        speed = tracker.get_velocity(v.track_id) if v.track_id is not None else 0.0
        v.velocity = speed
        moving = speed > SPEED_THRESHOLD
        in_zone = _in_track_zone(v)

        if barrier_just_closed and in_zone:
            return "BARRIER_CLOSING_VIOLATION"

        if barrier_state == "down" and in_zone and moving:
            return "BARRIER_VIOLATION"

        if barrier_state == "down" and in_zone and not moving:
            return "STALLED_ON_TRACKS"

        if has_red and moving and in_zone:
            return "RED_LIGHT_VIOLATION"

    for p in pedestrians:
        if _in_track_zone(p):
            return "PEDESTRIAN_ON_TRACKS"

    for c in cyclists:
        if _in_track_zone(c):
            return "CYCLIST_ON_TRACKS"

    return None
