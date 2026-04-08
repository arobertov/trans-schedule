"""
output_formatter.py — Formats the shift schedule as readable tables.
"""

from __future__ import annotations

from datetime import timedelta
from typing import List

from block_generator import DrivingBlock
from shift_scheduler import Shift, MORNING, DAY, NIGHT


def _td_str(td: timedelta) -> str:
    total = int(td.total_seconds())
    sign = "" if total >= 0 else "-"
    total = abs(total)
    h = total // 3600
    m = (total % 3600) // 60
    return f"{sign}{h}:{m:02d}"


def _time_str(td: timedelta) -> str:
    """Format a time-of-day timedelta (wraps at 24h)."""
    total = int(td.total_seconds())
    h = (total // 3600) % 24
    m = (total % 3600) // 60
    return f"{h}:{m:02d}"


SHIFT_TYPE_NAMES = {
    MORNING: "Morning Shift",
    DAY: "Day Shift",
    NIGHT: "Night Shift",
}


def format_shift(shift: Shift) -> str:
    """Format a single shift as a detailed block diagram."""
    lines: List[str] = []
    sep = "═" * 65
    thin = "─" * 65

    type_name = SHIFT_TYPE_NAMES.get(shift.shift_type, shift.shift_type)
    lines.append(sep)
    lines.append(f"{shift.shift_id} ({type_name})")
    lines.append(thin)
    lines.append(
        f"  {'Route':<8}│ {'Board':<12}│ {'Time':<7}│ {'Alight':<12}│ {'Time':<7}│ Drive"
    )
    lines.append(f"  {'─'*8}┼{'─'*13}┼{'─'*8}┼{'─'*13}┼{'─'*8}┼{'─'*6}")

    for i, entry in enumerate(shift.entries):
        b = entry.block
        lines.append(
            f"  {b.route_id:<8}│ {b.board_station:<12}│ {b.board_time_str():<7}│ "
            f"{b.alight_station:<12}│ {b.alight_time_str():<7}│ {b.drive_str()}"
        )
        if entry.rest_after is not None:
            lines.append(
                f"  {'':<8}│ {'REST':<12}│ {'':<7}│ {'':<12}│ {'':<7}│ {_td_str(entry.rest_after)}"
            )

    lines.append(thin)
    start_s = _time_str(shift.start_time())
    end_s = _time_str(shift.end_time())
    total_s = _td_str(shift.total_duration())
    drive_s = _td_str(shift.total_drive())
    lines.append(
        f"  Total: {start_s} – {end_s} │ Drive: {drive_s} │ Shift: {total_s}"
    )
    lines.append(sep)
    return "\n".join(lines)


def format_summary_table(shifts: List[Shift]) -> str:
    """Format a compact summary table of all shifts."""
    lines: List[str] = []
    lines.append("")
    lines.append("SHIFT SUMMARY")
    lines.append("=" * 85)
    header = (
        f"  {'Shift':<12}│ {'Type':<8}│ {'Start':<7}│ {'End':<7}│ "
        f"{'Drive':<7}│ {'Total':<7}│ Routes"
    )
    lines.append(header)
    lines.append(f"  {'─'*12}┼{'─'*9}┼{'─'*8}┼{'─'*8}┼{'─'*8}┼{'─'*8}┼{'─'*20}")

    type_order = {MORNING: 0, DAY: 1, NIGHT: 2}
    sorted_shifts = sorted(shifts, key=lambda s: (type_order.get(s.shift_type, 3), s.start_time()))

    for s in sorted_shifts:
        routes = ", ".join(dict.fromkeys(e.block.route_id for e in s.entries))
        lines.append(
            f"  {s.shift_id:<12}│ {SHIFT_TYPE_NAMES.get(s.shift_type, s.shift_type):<8}│ "
            f"{_time_str(s.start_time()):<7}│ {_time_str(s.end_time()):<7}│ "
            f"{_td_str(s.total_drive()):<7}│ {_td_str(s.total_duration()):<7}│ {routes}"
        )

    lines.append("=" * 85)
    return "\n".join(lines)


def format_coverage_matrix(shifts: List[Shift], all_route_ids: List[str]) -> str:
    """Format a coverage matrix showing which shift covers which route segment."""
    lines: List[str] = []
    lines.append("")
    lines.append("COVERAGE MATRIX")
    lines.append(
        "Shows which blocks of each route are covered by which shift."
    )
    lines.append("")

    # Build mapping: route_id -> list of (block_index, shift_id)
    coverage: dict[str, dict[int, str]] = {}
    for s in shifts:
        for e in s.entries:
            b = e.block
            coverage.setdefault(b.route_id, {})[b.block_index] = s.shift_id

    col_w = 14
    for route_id in all_route_ids:
        if route_id not in coverage:
            lines.append(f"  Route {route_id}: NO COVERAGE ⚠️")
            continue
        block_map = coverage[route_id]
        max_idx = max(block_map.keys())
        row = f"  Route {route_id:<12}: "
        for i in range(max_idx + 1):
            sid = block_map.get(i, "???")
            row += f"[{i}:{sid}] "
        lines.append(row)

    return "\n".join(lines)


def format_validation_report(result) -> str:
    """Format the validation result as a human-readable report."""
    lines: List[str] = []
    lines.append("")
    lines.append("VALIDATION REPORT")
    lines.append("=" * 50)

    for msg in result.warnings:
        if msg.startswith("OK "):
            lines.append(f"✅ {msg[3:]}")
        elif msg.startswith("WARN "):
            lines.append(f"⚠️  {msg[5:]}")
        else:
            lines.append(f"ℹ️  {msg}")

    for msg in result.errors:
        lines.append(f"❌ {msg}")

    lines.append("")
    if result.ok:
        lines.append("✅ Schedule is VALID")
    else:
        lines.append(f"❌ Schedule has {len(result.errors)} error(s)")
    return "\n".join(lines)


def format_counts(shifts: List[Shift]) -> str:
    morning = sum(1 for s in shifts if s.shift_type == MORNING)
    day = sum(1 for s in shifts if s.shift_type == DAY)
    night = sum(1 for s in shifts if s.shift_type == NIGHT)
    return (
        f"\nShift counts: Morning(С)={morning}  Day(Д)={day}  Night(Н)={night}  "
        f"Total={len(shifts)}"
    )
