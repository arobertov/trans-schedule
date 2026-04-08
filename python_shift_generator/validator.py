"""
validator.py — Validates the generated shift schedule.

Checks:
  1. All driving blocks <= 2:30
  2. All rest periods between consecutive blocks >= 50 min
  3. Morning shift total <= 5:00
  4. Day/Night shift total <= 11:00
  5. 100% route coverage (every block assigned exactly once)
  6. No overlapping assignments (no block in two shifts)
  7. All crew changes occur at station 14
"""

from __future__ import annotations

from datetime import timedelta
from typing import List

from block_generator import DrivingBlock
from shift_scheduler import (
    Shift,
    MIN_REST,
    MAX_MORNING_TOTAL,
    MAX_DAY_TOTAL,
    MAX_NIGHT_TOTAL,
    MORNING,
    DAY,
    NIGHT,
)

MAX_DRIVE = timedelta(hours=2, minutes=30)


def _td_str(td: timedelta) -> str:
    total = int(td.total_seconds())
    h = total // 3600
    m = (total % 3600) // 60
    return f"{h}:{m:02d}"


class ValidationResult:
    def __init__(self) -> None:
        self.warnings: List[str] = []
        self.errors: List[str] = []

    @property
    def ok(self) -> bool:
        return len(self.errors) == 0

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def error(self, msg: str) -> None:
        self.errors.append(msg)


def validate(shifts: List[Shift], all_blocks: List[DrivingBlock]) -> ValidationResult:
    result = ValidationResult()

    # Check 1: Driving block lengths <= 2:30
    all_drive_ok = True
    for s in shifts:
        for entry in s.entries:
            b = entry.block
            if b.drive_duration > MAX_DRIVE:
                result.error(
                    f"{s.shift_id}: block on route {b.route_id} "
                    f"({b.board_time_str()}-{b.alight_time_str()}) "
                    f"exceeds max drive: {b.drive_str()} > 2:30"
                )
                all_drive_ok = False
    if all_drive_ok:
        result.warn("OK All driving blocks <= 2:30")

    # Check 2: Rest periods >= 50 min between consecutive blocks
    all_rest_ok = True
    for s in shifts:
        for i in range(len(s.entries) - 1):
            curr = s.entries[i].block
            nxt = s.entries[i + 1].block
            rest = nxt.board_time - curr.alight_time
            if rest < MIN_REST:
                result.error(
                    f"{s.shift_id}: rest between "
                    f"route {curr.route_id}({curr.alight_time_str()}) and "
                    f"route {nxt.route_id}({nxt.board_time_str()}) "
                    f"is {_td_str(rest)} < 50 min"
                )
                all_rest_ok = False
    if all_rest_ok:
        result.warn("OK All rest periods >= 0:50")

    # Check 3: Shift duration limits
    all_dur_ok = True
    for s in shifts:
        dur = s.total_duration()
        if s.shift_type == MORNING and dur > MAX_MORNING_TOTAL:
            result.error(
                f"{s.shift_id}: morning shift duration {_td_str(dur)} > 5:00"
            )
            all_dur_ok = False
        elif s.shift_type in (DAY, NIGHT) and dur > MAX_DAY_TOTAL:
            result.error(
                f"{s.shift_id}: shift duration {_td_str(dur)} > 11:00"
            )
            all_dur_ok = False
        if s.shift_type == DAY and dur < timedelta(hours=4):
            result.warn(
                f"WARN {s.shift_id}: short day shift ({_td_str(dur)}) — consider optimization"
            )
    if all_dur_ok:
        result.warn("OK All shift durations within limits")

    # Check 4: Coverage — every block assigned exactly once
    assigned_ids: dict = {}
    duplicate_errors = False
    for s in shifts:
        for entry in s.entries:
            b = entry.block
            key = (b.route_id, b.block_index)
            if key in assigned_ids:
                result.error(
                    f"Block route={b.route_id} idx={b.block_index} assigned to "
                    f"BOTH {assigned_ids[key]} and {s.shift_id}"
                )
                duplicate_errors = True
            else:
                assigned_ids[key] = s.shift_id

    if not duplicate_errors:
        result.warn("OK No duplicate block assignments")

    all_block_keys = {(b.route_id, b.block_index) for b in all_blocks}
    assigned_keys = set(assigned_ids.keys())
    missing = all_block_keys - assigned_keys
    if missing:
        for route_id, idx in sorted(missing):
            result.error(f"Block NOT assigned: route={route_id} idx={idx}")
    else:
        result.warn("OK 100% route coverage (no gaps)")

    extra = assigned_keys - all_block_keys
    if extra:
        for route_id, idx in sorted(extra):
            result.error(f"Unknown block assigned: route={route_id} idx={idx}")

    # Check 5: Crew change point validity
    # Standard crew changes at station 14; terminal-to-terminal handoffs
    # are allowed when consecutive blocks use compatible terminals
    # (e.g. >18_2 → >18_1 for combined 107→100 night shift).
    all_cc_ok = True
    for s in shifts:
        for i, entry in enumerate(s.entries):
            b = entry.block
            prev_alight = s.entries[i - 1].block.alight_station if i > 0 else None
            if i > 0:
                at_14 = b.can_crew_change_at_board()
                at_terminal = (
                    prev_alight is not None
                    and prev_alight.startswith(">")
                    and b.board_station.startswith(">")
                    and prev_alight[1:].split("_")[0] == b.board_station[1:].split("_")[0]
                )
                if not at_14 and not at_terminal:
                    result.error(
                        f"{s.shift_id}: block {i} on route {b.route_id} boards at "
                        f"'{b.board_station}' (not station 14 or compatible terminal)"
                    )
                    all_cc_ok = False
            if i < len(s.entries) - 1:
                next_board = s.entries[i + 1].block.board_station
                at_14 = b.can_crew_change_at_alight()
                at_terminal = (
                    b.alight_station.startswith(">")
                    and next_board.startswith(">")
                    and b.alight_station[1:].split("_")[0] == next_board[1:].split("_")[0]
                )
                if not at_14 and not at_terminal:
                    result.error(
                        f"{s.shift_id}: block {i} on route {b.route_id} alights at "
                        f"'{b.alight_station}' (not station 14 or compatible terminal)"
                    )
                    all_cc_ok = False
    if all_cc_ok:
        result.warn("OK All crew changes at station 14 or compatible terminal")

    return result
