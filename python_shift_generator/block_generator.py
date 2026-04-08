"""
block_generator.py — Splits each route segment into driving blocks.

Rules:
- Maximum continuous driving per block: 2 hours 30 minutes
- A block must start and end at station 14 (14_1 or 14_2),
  EXCEPT for the very first block (which may start at Depo/terminal)
  and the very last block (which may end at Depo/terminal).
- Greedy algorithm: from each block start, find the LATEST station-14 stop
  within the 2:30 window and use it as the block end.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import List

from schedule_parser import RouteSegment, Stop

MAX_DRIVE = timedelta(hours=2, minutes=30)


@dataclass(frozen=True)
class DrivingBlock:
    route_id: str
    train: int
    block_index: int        # 0-based index within route

    board_station: str      # where the driver boards
    board_time: timedelta
    alight_station: str     # where the driver alights (crew change point)
    alight_time: timedelta

    @property
    def drive_duration(self) -> timedelta:
        return self.alight_time - self.board_time

    def board_time_str(self) -> str:
        return _td_to_str(self.board_time)

    def alight_time_str(self) -> str:
        return _td_to_str(self.alight_time)

    def drive_str(self) -> str:
        return _td_to_str(self.drive_duration)

    def can_crew_change_at_board(self) -> bool:
        """True if a crew change can happen at the boarding point."""
        return self.board_station in ("14_1", "14_2")

    def can_crew_change_at_alight(self) -> bool:
        """True if a crew change can happen at the alighting point."""
        return self.alight_station in ("14_1", "14_2")


def _td_to_str(td: timedelta) -> str:
    total = int(td.total_seconds())
    h = total // 3600
    m = (total % 3600) // 60
    return f"{h}:{m:02d}"


def generate_blocks(segment: RouteSegment) -> List[DrivingBlock]:
    """
    Generate driving blocks for a route segment using a greedy approach:
    - From the current block start, find the latest station-14 stop within MAX_DRIVE.
    - If no station-14 stop is reachable within MAX_DRIVE from the current position,
      use the farthest reachable stop (this handles edge cases like short final legs).
    """
    stops = segment.stops
    if len(stops) < 2:
        return []

    blocks: List[DrivingBlock] = []
    block_index = 0
    start_idx = 0  # index into stops where current block begins

    while start_idx < len(stops) - 1:
        start_stop = stops[start_idx]
        block_start_time = start_stop.time
        deadline = block_start_time + MAX_DRIVE

        # Find the latest station-14 stop within the deadline
        best_end_idx = -1
        for i in range(start_idx + 1, len(stops)):
            stop = stops[i]
            if stop.time > deadline:
                break
            if stop.is_station14() or stop.is_depo() or stop.is_terminal():
                best_end_idx = i

        if best_end_idx == -1:
            # No valid crew-change stop found within window; this shouldn't happen
            # if the route is well-formed.  Fall back to next stop.
            best_end_idx = start_idx + 1

        end_stop = stops[best_end_idx]

        # Prefer to end at a station-14 stop (not depot/terminal) unless it's the
        # last stop of the route.
        if not end_stop.is_station14() and best_end_idx != len(stops) - 1:
            # Try to find a station-14 stop before this
            for i in range(best_end_idx - 1, start_idx, -1):
                if stops[i].is_station14():
                    best_end_idx = i
                    end_stop = stops[i]
                    break

        block = DrivingBlock(
            route_id=segment.route_id,
            train=segment.train,
            block_index=block_index,
            board_station=start_stop.station,
            board_time=start_stop.time,
            alight_station=end_stop.station,
            alight_time=end_stop.time,
        )
        blocks.append(block)
        block_index += 1

        if best_end_idx == len(stops) - 1:
            # Reached the end of the route
            break

        start_idx = best_end_idx

    return blocks


def generate_all_blocks(segments: List[RouteSegment]) -> List[DrivingBlock]:
    """Generate driving blocks for all route segments."""
    all_blocks: List[DrivingBlock] = []
    for seg in segments:
        seg_blocks = generate_blocks(seg)
        all_blocks.extend(seg_blocks)
    return all_blocks


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "src")
    from schedule_parser import parse_csv

    csv_file = sys.argv[1] if len(sys.argv) > 1 else "data/schedule_26_01_2026.csv"
    segments = parse_csv(csv_file)
    all_blocks = generate_all_blocks(segments)

    current_route = None
    for b in all_blocks:
        if b.route_id != current_route:
            print(f"\n{'─'*65}")
            print(f"Route {b.route_id}")
            current_route = b.route_id
        print(
            f"  Block {b.block_index}: {b.board_station}({b.board_time_str()}) → "
            f"{b.alight_station}({b.alight_time_str()})  drive={b.drive_str()}"
        )

    print(f"\nTotal blocks: {len(all_blocks)}")
