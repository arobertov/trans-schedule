"""
schedule_parser.py — Parses the transit timetable CSV into structured route data.

Handles:
- Semicolon-separated CSV with columns: Train, Stations, Arrived
- Route splitting for routes 101 and 102 (morning/evening segments separated by Depo)
- Midnight crossing times (e.g. 0:15 treated as 24:15 when route runs past midnight)
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path
from typing import List


@dataclass
class Stop:
    station: str
    time: timedelta  # time from midnight (may exceed 24h for next-day arrivals)

    def time_str(self) -> str:
        total = int(self.time.total_seconds())
        h = (total // 3600) % 24
        m = (total % 3600) // 60
        return f"{h}:{m:02d}"

    def is_station14(self) -> bool:
        return self.station in ("14_1", "14_2")

    def is_depo(self) -> bool:
        return self.station == "Depo"

    def is_terminal(self) -> bool:
        return self.station.startswith(">")


@dataclass
class RouteSegment:
    route_id: str       # e.g. '100', '101-morning', '101-evening'
    train: int          # train number from CSV
    stops: List[Stop] = field(default_factory=list)

    def start_time(self) -> timedelta:
        return self.stops[0].time

    def end_time(self) -> timedelta:
        return self.stops[-1].time

    def station14_stops(self) -> List[Stop]:
        return [s for s in self.stops if s.is_station14()]

    def duration(self) -> timedelta:
        return self.stops[-1].time - self.stops[0].time


def _parse_time(time_str: str, prev_time: timedelta | None = None) -> timedelta:
    """Parse HH:MM string to timedelta from midnight, handling midnight crossing."""
    parts = time_str.strip().split(":")
    h, m = int(parts[0]), int(parts[1])
    t = timedelta(hours=h, minutes=m)
    if prev_time is not None and t < prev_time - timedelta(minutes=5):
        # Handle midnight crossing: if this time is much earlier than prev,
        # assume it's the next day
        t += timedelta(hours=24)
    return t


def _split_route_by_depo(train: int, raw_stops: List[tuple]) -> List[RouteSegment]:
    """
    Split a route into segments wherever there are consecutive Depo entries.
    Routes 101 and 102 have a mid-day depot break.
    Returns a list of RouteSegment objects.
    """
    segments: List[RouteSegment] = []
    current_stops: List[tuple] = []

    for station, time_str in raw_stops:
        current_stops.append((station, time_str))
        if station == "Depo" and len(current_stops) > 1:
            # Check if next entry is also Depo (segment break)
            # We'll handle this by looking ahead; for now collect all
            pass

    # Find depot-to-depot breaks
    # A segment break occurs when a Depo stop is immediately followed by another Depo
    # (the train goes to depot, stays, then comes out as a new segment)
    break_indices = []
    for i in range(len(raw_stops) - 1):
        st_curr = raw_stops[i][0]
        st_next = raw_stops[i + 1][0]
        if st_curr == "Depo" and st_next == "Depo":
            break_indices.append(i)

    if not break_indices:
        # Single segment
        seg = RouteSegment(route_id=str(train), train=train)
        prev = None
        for station, time_str in raw_stops:
            t = _parse_time(time_str, prev)
            seg.stops.append(Stop(station=station, time=t))
            prev = t
        segments.append(seg)
    else:
        # Multiple segments
        suffix_map = {0: "-morning", 1: "-evening", 2: "-night"}
        seg_raw_groups = []
        start = 0
        for bi in break_indices:
            seg_raw_groups.append(raw_stops[start : bi + 1])
            start = bi + 1
        seg_raw_groups.append(raw_stops[start:])

        for idx, group in enumerate(seg_raw_groups):
            suffix = suffix_map.get(idx, f"-seg{idx}")
            seg = RouteSegment(route_id=f"{train}{suffix}", train=train)
            prev = None
            for station, time_str in group:
                t = _parse_time(time_str, prev)
                seg.stops.append(Stop(station=station, time=t))
                prev = t
            if len(seg.stops) >= 2:
                segments.append(seg)

    return segments


def parse_csv(csv_path: str | Path) -> List[RouteSegment]:
    """
    Parse the timetable CSV and return a list of RouteSegment objects.

    Routes 101 and 102 are automatically split into morning/evening segments
    when consecutive Depo entries are detected.
    """
    raw: dict[int, List[tuple]] = {}

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            train = int(row["Train"])
            station = row["Stations"].strip()
            arrived = row["Arrived"].strip()
            raw.setdefault(train, []).append((station, arrived))

    segments: List[RouteSegment] = []
    for train in sorted(raw.keys()):
        route_segments = _split_route_by_depo(train, raw[train])
        segments.extend(route_segments)

    return segments


if __name__ == "__main__":
    import sys
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "data/schedule_26_01_2026.csv"
    segments = parse_csv(csv_file)
    for seg in segments:
        st = seg.stops[0]
        en = seg.stops[-1]
        print(
            f"Route {seg.route_id:15s}  {st.station}({st.time_str()}) → "
            f"{en.station}({en.time_str()})  "
            f"[{len(seg.stops)} stops, {len(seg.station14_stops())} at st.14]"
        )
