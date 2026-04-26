from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from threading import Lock


logger = logging.getLogger("kanban.observability")


def setup_structured_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return
    logging.basicConfig(level=logging.INFO, format="%(message)s")


def log_event(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


@dataclass(frozen=True)
class LatencyBucket:
    le: float
    key: str


LATENCY_BUCKETS = (
    LatencyBucket(0.05, "0.05"),
    LatencyBucket(0.1, "0.1"),
    LatencyBucket(0.25, "0.25"),
    LatencyBucket(0.5, "0.5"),
    LatencyBucket(1.0, "1.0"),
    LatencyBucket(2.5, "2.5"),
    LatencyBucket(5.0, "5.0"),
)


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self.started_at = time.time()
        self.requests_total = 0
        self.errors_total = 0
        self.request_duration_seconds_sum = 0.0
        self.request_duration_seconds_count = 0
        self.request_duration_buckets: dict[str, int] = {bucket.key: 0 for bucket in LATENCY_BUCKETS}

    def observe_request(self, *, status_code: int, duration_seconds: float) -> None:
        with self._lock:
            self.requests_total += 1
            self.request_duration_seconds_sum += duration_seconds
            self.request_duration_seconds_count += 1
            if status_code >= 500:
                self.errors_total += 1

            for bucket in LATENCY_BUCKETS:
                if duration_seconds <= bucket.le:
                    self.request_duration_buckets[bucket.key] += 1

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            return {
                "started_at": self.started_at,
                "requests_total": self.requests_total,
                "errors_total": self.errors_total,
                "request_duration_seconds_sum": self.request_duration_seconds_sum,
                "request_duration_seconds_count": self.request_duration_seconds_count,
                "request_duration_buckets": dict(self.request_duration_buckets),
            }


metrics_registry = MetricsRegistry()
