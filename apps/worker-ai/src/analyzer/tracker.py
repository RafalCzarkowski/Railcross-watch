import numpy as np
from .models import BBox

VEHICLE_LABELS = {"car", "truck", "bus", "motorcycle", "bicycle"}
SPEED_THRESHOLD = 0.02


class CentroidTracker:
    def __init__(self, max_disappeared: int = 10) -> None:
        self._next_id = 0
        self._objects: dict[int, np.ndarray] = {}
        self._disappeared: dict[int, int] = {}
        self._velocities: dict[int, float] = {}
        self.max_disappeared = max_disappeared

    def update(self, boxes: list[BBox]) -> list[BBox]:
        if not boxes:
            for obj_id in list(self._disappeared):
                self._disappeared[obj_id] += 1
                if self._disappeared[obj_id] > self.max_disappeared:
                    self._deregister(obj_id)
            return boxes

        centroids = np.array([[b.x, b.y] for b in boxes])

        if not self._objects:
            for i, c in enumerate(centroids):
                self._register(c)
                boxes[i].track_id = self._next_id - 1
            return boxes

        obj_ids = list(self._objects.keys())
        obj_centroids = np.array(list(self._objects.values()))

        D = np.linalg.norm(obj_centroids[:, None] - centroids[None, :], axis=2)
        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows: set[int] = set()
        used_cols: set[int] = set()

        for row, col in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue
            obj_id = obj_ids[row]
            prev = self._objects[obj_id]
            curr = centroids[col]
            self._velocities[obj_id] = float(np.linalg.norm(curr - prev))
            self._objects[obj_id] = curr
            self._disappeared[obj_id] = 0
            boxes[col].track_id = obj_id
            used_rows.add(row)
            used_cols.add(col)

        unused_rows = set(range(len(obj_ids))) - used_rows
        unused_cols = set(range(len(centroids))) - used_cols

        for row in unused_rows:
            obj_id = obj_ids[row]
            self._disappeared[obj_id] += 1
            if self._disappeared[obj_id] > self.max_disappeared:
                self._deregister(obj_id)

        for col in unused_cols:
            self._register(centroids[col])
            boxes[col].track_id = self._next_id - 1

        return boxes

    def get_velocity(self, track_id: int) -> float:
        return self._velocities.get(track_id, 0.0)

    def _register(self, centroid: np.ndarray) -> None:
        self._objects[self._next_id] = centroid
        self._disappeared[self._next_id] = 0
        self._velocities[self._next_id] = 0.0
        self._next_id += 1

    def _deregister(self, obj_id: int) -> None:
        del self._objects[obj_id]
        del self._disappeared[obj_id]
        self._velocities.pop(obj_id, None)
