"""
shift_scheduler.py — Assigns driving blocks to shifts.

Shift types:
  Morning (С): starts ~4:00–9:30, total shift ≤ 5 hours
  Day     (Д): covers mid-day blocks, total shift ≤ 11 hours
  Night   (Н): starts ~15:00+, total shift ≤ 11 hours
               Includes special combined shifts: 107→100 and 108→101
               that cross midnight (last block of 107/108 + first block of 100/101-m)

Rules:
  - Min rest between consecutive blocks in the same shift: 50 minutes
  - Max continuous driving per block: 2:30 (enforced by block_generator)
  - Driver boards/alights only at station 14 (or Depo/terminal for route ends)
  - After alighting at a terminal station, driver may board another route at a
    compatible terminal (same station number, e.g. >18_1 and >18_2)
  - Routes 101-evening and 102-evening are covered by Day shifts

Target: ~15 Morning + ~15 Day + ~15 Night shifts covering all blocks exactly once.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import List, Optional

from block_generator import DrivingBlock

MIN_REST = timedelta(minutes=50)
MAX_MORNING_TOTAL = timedelta(hours=5)
MAX_DAY_TOTAL = timedelta(hours=11)
MAX_NIGHT_TOTAL = timedelta(hours=11)

MORNING = "С"
DAY = "Д"
NIGHT = "Н"


def _td(h: int, m: int = 0) -> timedelta:
    return timedelta(hours=h, minutes=m)


def _terminal_base(station: str) -> str:
    """Return the base station id for a terminal stop, e.g. '>18_1' -> '18'."""
    if station.startswith(">"):
        return station[1:].split("_")[0]
    return ""


def compatible_for_handoff(prev_alight: str, next_board: str) -> bool:
    """
    True if a driver can transfer from prev_alight to next_board without
    a train at station 14 — i.e. both are terminal stops at the same station.
    """
    if prev_alight in ("14_1", "14_2") or next_board in ("14_1", "14_2"):
        return False
    if not (prev_alight.startswith(">") and next_board.startswith(">")):
        return False
    return _terminal_base(prev_alight) == _terminal_base(next_board)


@dataclass
class ShiftEntry:
    block: DrivingBlock
    rest_after: Optional[timedelta] = None


@dataclass
class Shift:
    shift_id: str
    shift_type: str
    entries: List[ShiftEntry] = field(default_factory=list)

    def start_time(self) -> timedelta:
        return self.entries[0].block.board_time if self.entries else timedelta(0)

    def end_time(self) -> timedelta:
        return self.entries[-1].block.alight_time if self.entries else timedelta(0)

    def total_duration(self) -> timedelta:
        if not self.entries:
            return timedelta(0)
        return self.end_time() - self.start_time()

    def total_drive(self) -> timedelta:
        return sum((e.block.drive_duration for e in self.entries), timedelta(0))

    def last_block(self) -> Optional[DrivingBlock]:
        return self.entries[-1].block if self.entries else None

    def can_add_block(self, block: DrivingBlock, shift_type: str) -> bool:
        """Check if a block can be appended respecting rest and duration constraints."""
        if not self.entries:
            return True

        last = self.entries[-1].block

        # Check rest period
        rest = block.board_time - last.alight_time
        if rest < MIN_REST:
            return False

        # Check boarding location is valid for a crew change
        at_14 = block.can_crew_change_at_board()
        at_terminal = compatible_for_handoff(last.alight_station, block.board_station)
        if not at_14 and not at_terminal:
            return False

        # Check that previous block ended at a valid crew change point
        prev_at_14 = last.can_crew_change_at_alight()
        prev_at_terminal = last.alight_station.startswith(">")
        if not prev_at_14 and not prev_at_terminal:
            return False

        # Check total shift duration
        new_total = block.alight_time - self.start_time()
        if shift_type == MORNING and new_total > MAX_MORNING_TOTAL:
            return False
        if shift_type in (DAY, NIGHT) and new_total > MAX_DAY_TOTAL:
            return False

        return True

    def add_block(self, block: DrivingBlock) -> None:
        if self.entries:
            last = self.entries[-1]
            last.rest_after = block.board_time - last.block.alight_time
        self.entries.append(ShiftEntry(block=block))


def assign_shifts(all_blocks: List[DrivingBlock]) -> List[Shift]:
    """
    Assign all driving blocks to shifts.

    Strategy:
      0. Build 2 combined Night shifts (107→100 and 108→101) that cross midnight.
      1. Classify remaining blocks as Morning / Day / Night candidates.
      2. Build Morning shifts: one or two early-morning blocks per shift.
      3. Build Night shifts: late-evening/night blocks per shift.
      4. Build Day shifts: mid-day blocks combined 2-4 blocks per shift.
      5. Assign any leftover blocks to Day shifts.
    """
    morning_counter = [0]
    day_counter = [0]
    night_counter = [0]

    def new_shift(stype: str) -> Shift:
        if stype == MORNING:
            morning_counter[0] += 1
            return Shift(f"СМ{morning_counter[0]}-{MORNING}", stype)
        elif stype == DAY:
            day_counter[0] += 1
            return Shift(f"СМ{day_counter[0]}-{DAY}", stype)
        else:
            night_counter[0] += 1
            return Shift(f"СМ{night_counter[0]}-{NIGHT}", stype)

    unassigned: List[DrivingBlock] = list(all_blocks)
    shifts: List[Shift] = []

    def pop_block(b: DrivingBlock) -> None:
        unassigned.remove(b)

    def find_block(route_id: str, idx: int) -> Optional[DrivingBlock]:
        for b in unassigned:
            if b.route_id == route_id and b.block_index == idx:
                return b
        return None

    def last_block_of(route_id: str) -> Optional[DrivingBlock]:
        candidates = [b for b in unassigned if b.route_id == route_id]
        return max(candidates, key=lambda b: b.block_index) if candidates else None

    def first_block_of(route_id: str) -> Optional[DrivingBlock]:
        candidates = [b for b in unassigned if b.route_id == route_id]
        return min(candidates, key=lambda b: b.block_index) if candidates else None

    # ------------------------------------------------------------------ #
    # Phase 0: Combined Night shifts crossing midnight                    #
    # 107 (last block) → 100 (first block next day)                      #
    # 108 (last block) → 101-morning (first block next day)              #
    # ------------------------------------------------------------------ #
    for route_a, route_b in [("107", "100"), ("108", "101-morning")]:
        last_a = last_block_of(route_a)
        first_b = first_block_of(route_b)
        if last_a is None or first_b is None:
            continue

        # Adjust first_b time to next day for combined shift calculation
        adjusted_b = DrivingBlock(
            route_id=first_b.route_id,
            train=first_b.train,
            block_index=first_b.block_index,
            board_station=first_b.board_station,
            board_time=first_b.board_time + timedelta(hours=24),
            alight_station=first_b.alight_station,
            alight_time=first_b.alight_time + timedelta(hours=24),
        )

        # Verify the combined shift is feasible
        rest = adjusted_b.board_time - last_a.alight_time
        total = adjusted_b.alight_time - last_a.board_time
        if rest >= MIN_REST and total <= MAX_NIGHT_TOTAL:
            s = new_shift(NIGHT)
            s.add_block(last_a)
            s.add_block(adjusted_b)
            pop_block(last_a)
            pop_block(first_b)
            shifts.append(s)

    # ------------------------------------------------------------------ #
    # Phase 1: Classify remaining blocks                                  #
    # ------------------------------------------------------------------ #
    # Morning candidates:
    #   - First blocks (from Depo/terminal) starting before 09:00
    #   - Station-14 starters with board_time < 07:30 (early second blocks)
    def is_morning_candidate(b: DrivingBlock) -> bool:
        if b.board_time >= _td(9, 30):
            return False
        if b.board_station not in ("14_1", "14_2"):
            return True   # Depo/terminal first block
        return b.board_time < _td(7, 30)  # early station-14 starter

    # Night candidates: board_time >= 16:30
    # BUT routes 101-evening and 102-evening are Day (even though they start at 16:xx)
    def is_night_candidate(b: DrivingBlock) -> bool:
        if b.route_id in ("101-evening", "102-evening"):
            return False
        return b.board_time >= _td(16, 30)

    # ------------------------------------------------------------------ #
    # Phase 2: Morning shifts                                              #
    # ------------------------------------------------------------------ #
    morning_pool = sorted(
        [b for b in unassigned if is_morning_candidate(b)],
        key=lambda b: b.board_time,
    )

    # Build morning shifts greedily: take earliest available morning block,
    # try to add one more compatible block from the morning pool
    processed_morning_keys: set = set()

    for mb in morning_pool:
        key = (mb.route_id, mb.block_index)
        if key in processed_morning_keys or mb not in unassigned:
            continue

        s = new_shift(MORNING)
        s.add_block(mb)
        processed_morning_keys.add(key)
        pop_block(mb)

        # Try to extend with one more block (from morning pool OR any compatible block
        # that fits within the 5h morning limit)
        extend_candidates = sorted(
            [
                b for b in unassigned
                if b.board_time >= s.last_block().alight_time + MIN_REST
                and s.can_add_block(b, MORNING)
                and (b.route_id, b.block_index) not in processed_morning_keys
            ],
            key=lambda b: b.board_time,
        )
        for candidate in extend_candidates:
            ck = (candidate.route_id, candidate.block_index)
            s.add_block(candidate)
            processed_morning_keys.add(ck)
            pop_block(candidate)
            break

        shifts.append(s)

    # ------------------------------------------------------------------ #
    # Phase 3: Night shifts                                                #
    # ------------------------------------------------------------------ #
    night_pool = sorted(
        [b for b in unassigned if is_night_candidate(b)],
        key=lambda b: b.board_time,
    )

    processed_night_keys: set = set()

    for nb in night_pool:
        key = (nb.route_id, nb.block_index)
        if key in processed_night_keys or nb not in unassigned:
            continue

        s = new_shift(NIGHT)
        s.add_block(nb)
        processed_night_keys.add(key)
        pop_block(nb)

        # Try to extend with more night blocks
        while True:
            last = s.last_block()
            candidates = sorted(
                [
                    b for b in unassigned
                    if is_night_candidate(b)
                    and (b.route_id, b.block_index) not in processed_night_keys
                    and b.board_time >= last.alight_time + MIN_REST
                    and s.can_add_block(b, NIGHT)
                ],
                key=lambda b: b.board_time,
            )
            if not candidates:
                break
            chosen = candidates[0]
            s.add_block(chosen)
            processed_night_keys.add((chosen.route_id, chosen.block_index))
            pop_block(chosen)

        shifts.append(s)

    # ------------------------------------------------------------------ #
    # Phase 4: Day shifts                                                  #
    # Cover all remaining blocks (mid-day, 101-evening, 102-evening)     #
    # ------------------------------------------------------------------ #
    while unassigned:
        day_sorted = sorted(unassigned, key=lambda b: (b.board_time, b.route_id))
        first = day_sorted[0]

        s = new_shift(DAY)
        s.add_block(first)
        pop_block(first)

        # Greedily extend with compatible blocks; prefer blocks that minimise
        # rest gap (earliest start after MIN_REST from last alight)
        while True:
            last = s.last_block()
            if last is None:
                break
            earliest_next = last.alight_time + MIN_REST
            candidates = sorted(
                [
                    b for b in unassigned
                    if b.board_time >= earliest_next
                    and s.can_add_block(b, DAY)
                ],
                key=lambda b: (b.board_time, b.route_id),
            )
            if not candidates:
                break
            chosen = candidates[0]
            s.add_block(chosen)
            pop_block(chosen)

            # Stop if shift is getting long enough
            if s.total_duration() >= _td(9):
                break

        shifts.append(s)

    # Fix rest_after on last entry of each shift
    for s in shifts:
        if s.entries:
            s.entries[-1].rest_after = None

    return shifts
