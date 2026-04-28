"""
Pydantic models matching the PHP DrivingBlock, GenerationParameters,
and the solver's response format.
"""
from __future__ import annotations

from pydantic import BaseModel


class DrivingBlock(BaseModel):
    """Mirrors App\\Dto\\ShiftGenerator\\DrivingBlock from PHP."""
    route_id: str
    train: int
    block_index: int
    board_station: str
    board_time: int          # seconds from midnight
    alight_station: str
    alight_time: int         # seconds from midnight
    route_start_station: str
    route_end_station: str


class GenerationParameters(BaseModel):
    """Mirrors App\\Dto\\ShiftGenerator\\GenerationParameters from PHP."""
    max_drive_seconds: int         # e.g. 9000 (150 min)
    min_rest_seconds: int          # e.g. 3000 (50 min)
    cross_train_handoff_seconds: int  # e.g. 1200 (20 min)

    max_morning_seconds: int       # e.g. 18000 (300 min)
    max_day_seconds: int           # e.g. 39600 (660 min)
    max_night_seconds: int         # e.g. 39600 (660 min)

    min_morning_seconds: int       # e.g. 10800 (180 min)
    min_day_seconds: int           # e.g. 28800 (480 min)
    min_night_seconds: int         # e.g. 14400 (240 min)

    morning_threshold_seconds: int  # e.g. 34200 (09:30)
    night_threshold_seconds: int    # e.g. 59400 (16:30)
    morning_end_time_seconds: int   # e.g. 37800 (10:30)
    day_start_time_seconds: int     # e.g. 21600 (06:00)
    day_end_time_seconds: int       # e.g. 82800 (23:00)

    day_target_minutes: int         # e.g. 540 (9h)

    crew_change_stations: list[str]  # e.g. ["14_1", "14_2"]

    target_morning_shifts: int      # 0 = unlimited
    target_day_shifts: int
    target_night_shifts: int

    excluded_from_night: list[str] = ["101-evening", "102-evening"]


class SolveRequest(BaseModel):
    """Request payload sent by the PHP backend."""
    blocks: list[DrivingBlock]
    parameters: GenerationParameters
    phase0_shift_block_ids: list[list[int]] = []  # block indices already assigned in Phase 0
    timeout_seconds: int = 30


class ShiftAssignment(BaseModel):
    """One generated shift in the solution."""
    shift_type: str              # "С", "Д", "Н"
    block_indices: list[int]     # indices into the input blocks array, ordered


class SolveResponse(BaseModel):
    """Response sent back to PHP."""
    status: str                  # "optimal", "feasible", "infeasible", "timeout"
    shifts: list[ShiftAssignment]
    unassigned_block_indices: list[int]
    objective_value: float
    solve_time_ms: int
    feedback: list[str]
