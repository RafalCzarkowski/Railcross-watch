from .models import BBox
from .tracker import CentroidTracker, SPEED_THRESHOLD

TRACK_ZONE_X = (0.25, 0.75)
TRACK_ZONE_Y = (0.35, 1.0)

VEHICLE_LABELS = {"car", "truck", "bus", "motorcycle"}
PEDESTRIAN_LABELS = {"person"}
CYCLIST_LABELS = {"bicycle"}
RED_LABELS = {"traffic_light_red"}
GREEN_LABELS = {"traffic_light_green"}


def _in_track_zone(box: BBox) -> bool:
    return TRACK_ZONE_X[0] <= box.x <= TRACK_ZONE_X[1] and box.y >= TRACK_ZONE_Y[0]


def evaluate(boxes: list[BBox], barrier_state: str, tracker: CentroidTracker) -> str | None:
    has_red = any(b.label in RED_LABELS for b in boxes)
    has_green = any(b.label in GREEN_LABELS for b in boxes)
    vehicles = [b for b in boxes if b.label in VEHICLE_LABELS]
    pedestrians = [b for b in boxes if b.label in PEDESTRIAN_LABELS]
    cyclists = [b for b in boxes if b.label in CYCLIST_LABELS]

    for v in vehicles:
        speed = tracker.get_velocity(v.track_id) if v.track_id is not None else 0.0
        moving = speed > SPEED_THRESHOLD

        if barrier_state == "down" and _in_track_zone(v) and moving:
            return "BARRIER_VIOLATION"

        if has_red and moving and _in_track_zone(v):
            return "RED_LIGHT_VIOLATION"

    for p in pedestrians:
        if _in_track_zone(p):
            return "PEDESTRIAN_ON_TRACKS"

    for c in cyclists:
        if _in_track_zone(c):
            return "CYCLIST_ON_TRACKS"

    _ = has_green
    return None
