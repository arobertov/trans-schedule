"""
CP-SAT Constraint Programming solver for the Crew Scheduling Problem.

Replaces the greedy ShiftAssigner (Phases 2–6) with an optimal/near-optimal
constraint-based approach using Google OR-Tools.

Decision variables:
  x[s][b] ∈ {0, 1}  — block b is assigned to shift s
  y[b]    ∈ {0, 1}  — block b is assigned to any shift  (coverage indicator)
  active[s] ∈ {0, 1} — shift s has at least one block

Hard constraints:
  1. Each block assigned to at most one shift
  2. Blocks within a shift must be time-ordered and satisfy transition rules
  3. Continuous driving chains ≤ maxDrive
  4. Shift duration ≤ max per type
  5. Time boundary constraints (morning end, day start/end)
  6. Crew-change station validation for normal transitions

Objective: maximize total assigned blocks, penalize short shifts and excess shifts.
"""
from __future__ import annotations

import time
from typing import Optional

from ortools.sat.python import cp_model

from models import (
    DrivingBlock,
    GenerationParameters,
    ShiftAssignment,
    SolveResponse,
)

# Shift type constants (Bulgarian)
TYPE_MORNING = "С"
TYPE_DAY = "Д"
TYPE_NIGHT = "Н"

SHIFT_TYPES = [TYPE_MORNING, TYPE_DAY, TYPE_NIGHT]


def _station_base(station: str) -> str:
    """Strip terminal markers (> <) and track suffixes (_1, _2)."""
    s = station.lstrip("><")
    parts = s.split("_")
    return parts[0]


def _is_crew_change(station: str, crew_stations: list[str]) -> bool:
    return station in crew_stations


def _is_endpoint(station: str, block: DrivingBlock) -> bool:
    """Check if station is a route endpoint (Depo or terminal)."""
    return station.startswith(("Depo", ">", "<")) or station == block.route_start_station or station == block.route_end_station


def _classify_block(b: DrivingBlock, params: GenerationParameters) -> str:
    """Determine natural shift type for a block."""
    if b.board_time < params.morning_threshold_seconds:
        return TYPE_MORNING
    if b.board_time >= params.night_threshold_seconds and b.route_id not in params.excluded_from_night:
        return TYPE_NIGHT
    return TYPE_DAY


def _can_transition(prev: DrivingBlock, curr: DrivingBlock, params: GenerationParameters) -> tuple[bool, str]:
    """
    Check if curr can follow prev in a shift.
    Returns (allowed, transition_type) where transition_type is one of:
      'same_route', 'cross_train', 'normal', 'invalid'
    """
    gap = curr.board_time - prev.alight_time
    if gap < 0:
        return False, "invalid"

    # Same-route continuation (artificial boundary cut)
    if (prev.route_id == curr.route_id
            and curr.block_index == prev.block_index + 1
            and gap <= 1):
        return True, "same_route"

    # Cross-train handoff (different trains, same base station, small gap)
    if prev.train != curr.train:
        base_alight = _station_base(prev.alight_station)
        base_board = _station_base(curr.board_station)
        if (base_alight != "Depo"
                and base_alight == base_board
                and gap <= params.cross_train_handoff_seconds):
            return True, "cross_train"

    # Normal transition (needs rest + crew-change stations)
    if gap < params.min_rest_seconds:
        return False, "invalid"

    # Crew-change validation
    alight_ok = (_is_crew_change(prev.alight_station, params.crew_change_stations)
                 or _is_endpoint(prev.alight_station, prev))
    board_ok = (_is_crew_change(curr.board_station, params.crew_change_stations)
                or _is_endpoint(curr.board_station, curr))
    if not alight_ok or not board_ok:
        return False, "invalid"

    return True, "normal"


def _compute_compatible_pairs(blocks: list[DrivingBlock],
                              params: GenerationParameters
                              ) -> list[tuple[int, int, str]]:
    """
    Pre-compute all valid (i, j, transition_type) pairs where block j
    can follow block i in a shift. Only pairs where j starts after i ends.
    """
    pairs = []
    n = len(blocks)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            if blocks[j].board_time < blocks[i].alight_time:
                continue
            ok, ttype = _can_transition(blocks[i], blocks[j], params)
            if ok:
                pairs.append((i, j, ttype))
    return pairs


def _shift_type_params(stype: str, params: GenerationParameters) -> tuple[int, int]:
    """Return (max_duration, min_duration) for a shift type."""
    if stype == TYPE_MORNING:
        return params.max_morning_seconds, params.min_morning_seconds
    if stype == TYPE_DAY:
        return params.max_day_seconds, params.min_day_seconds
    return params.max_night_seconds, params.min_night_seconds


def _estimate_shift_count(blocks: list[DrivingBlock],
                          params: GenerationParameters) -> dict[str, int]:
    """Estimate how many shifts of each type we need (upper bound for slots)."""
    type_blocks: dict[str, list[DrivingBlock]] = {t: [] for t in SHIFT_TYPES}
    for b in blocks:
        t = _classify_block(b, params)
        type_blocks[t].append(b)

    counts = {}
    for t in SHIFT_TYPES:
        max_dur, _ = _shift_type_params(t, params)
        total_drive = sum(b.alight_time - b.board_time for b in type_blocks[t])
        # Rough estimate: total drive / (max_dur * 0.6) to leave room for rest
        if total_drive > 0:
            est = max(1, int(total_drive / (max_dur * 0.6)) + 2)
        else:
            est = 0
        counts[t] = est
    return counts


def solve(blocks: list[DrivingBlock],
          params: GenerationParameters,
          phase0_block_ids: list[list[int]],
          timeout_seconds: int = 30) -> SolveResponse:
    """
    Build and solve the CP-SAT model for crew scheduling.

    Args:
        blocks: All DrivingBlock instances from BlockGenerator
        params: Generation parameters (constraints)
        phase0_block_ids: Block indices already assigned in Phase 0 night shifts
        timeout_seconds: Solver time limit

    Returns:
        SolveResponse with shift assignments
    """
    start_time = time.monotonic()
    feedback: list[str] = []
    n = len(blocks)

    if n == 0:
        return SolveResponse(
            status="optimal",
            shifts=[],
            unassigned_block_indices=[],
            objective_value=0,
            solve_time_ms=0,
            feedback=["Няма блокове за разпределяне."],
        )

    # Blocks already taken by Phase 0
    phase0_assigned: set[int] = set()
    for group in phase0_block_ids:
        phase0_assigned.update(group)

    # Available blocks for the solver
    free_indices = [i for i in range(n) if i not in phase0_assigned]

    # Pre-compute compatible transition pairs among free blocks
    pairs = _compute_compatible_pairs(blocks, params)
    # Filter to free blocks only
    pairs = [(i, j, t) for i, j, t in pairs if i in set(free_indices) and j in set(free_indices)]

    # Build adjacency: for each block, which blocks can follow it
    successors: dict[int, list[tuple[int, str]]] = {i: [] for i in free_indices}
    predecessors: dict[int, list[tuple[int, str]]] = {i: [] for i in free_indices}
    for i, j, ttype in pairs:
        successors[i].append((j, ttype))
        predecessors[j].append((i, ttype))

    # Estimate shift slot count per type
    estimates = _estimate_shift_count([blocks[i] for i in free_indices], params)
    # Apply target overrides (if > 0)
    targets = {
        TYPE_MORNING: params.target_morning_shifts if params.target_morning_shifts > 0 else estimates.get(TYPE_MORNING, 5),
        TYPE_DAY: params.target_day_shifts if params.target_day_shifts > 0 else estimates.get(TYPE_DAY, 5),
        TYPE_NIGHT: params.target_night_shifts if params.target_night_shifts > 0 else estimates.get(TYPE_NIGHT, 5),
    }
    # Add margin for flexibility
    max_shifts_per_type = {t: max(v + 5, v * 2) for t, v in targets.items()}

    # ========================================================================
    # CP-SAT Model
    # ========================================================================
    model = cp_model.CpModel()

    # Decision variables

    # x[s_type][s_idx][b] = 1 if block b is assigned to shift (s_type, s_idx)
    x: dict[str, dict[int, dict[int, cp_model.IntVar]]] = {}
    # active[s_type][s_idx] = 1 if shift slot is used
    active: dict[str, dict[int, cp_model.IntVar]] = {}

    for stype in SHIFT_TYPES:
        x[stype] = {}
        active[stype] = {}
        for s_idx in range(max_shifts_per_type[stype]):
            active[stype][s_idx] = model.new_bool_var(f"active_{stype}_{s_idx}")
            x[stype][s_idx] = {}
            for b in free_indices:
                x[stype][s_idx][b] = model.new_bool_var(f"x_{stype}_{s_idx}_{b}")

    # -----------------------------------------------------------------------
    # Constraint 1: Each free block assigned to at most one shift
    # -----------------------------------------------------------------------
    for b in free_indices:
        all_assignments = []
        for stype in SHIFT_TYPES:
            for s_idx in range(max_shifts_per_type[stype]):
                all_assignments.append(x[stype][s_idx][b])
        model.add(sum(all_assignments) <= 1)

    # Coverage indicator: y[b] = 1 if block b is assigned to any shift
    y: dict[int, cp_model.IntVar] = {}
    for b in free_indices:
        y[b] = model.new_bool_var(f"y_{b}")
        all_assignments = []
        for stype in SHIFT_TYPES:
            for s_idx in range(max_shifts_per_type[stype]):
                all_assignments.append(x[stype][s_idx][b])
        model.add(y[b] == sum(all_assignments))

    # -----------------------------------------------------------------------
    # Constraint 2: If shift is inactive, no blocks assigned
    # -----------------------------------------------------------------------
    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype]):
            for b in free_indices:
                model.add(x[stype][s_idx][b] <= active[stype][s_idx])

    # -----------------------------------------------------------------------
    # Constraint 3: Time boundary constraints
    # -----------------------------------------------------------------------
    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype]):
            for b in free_indices:
                blk = blocks[b]

                # Morning shift must end by morning_end_time
                if stype == TYPE_MORNING and blk.alight_time > params.morning_end_time_seconds:
                    model.add(x[stype][s_idx][b] == 0)

                # Day shift: block must start >= day_start_time and end <= day_end_time
                if stype == TYPE_DAY:
                    if blk.board_time < params.day_start_time_seconds:
                        model.add(x[stype][s_idx][b] == 0)
                    if blk.alight_time > params.day_end_time_seconds:
                        model.add(x[stype][s_idx][b] == 0)

    # -----------------------------------------------------------------------
    # Constraint 4: Ordering — blocks in a shift must be time-ordered
    # and consecutive blocks must have valid transitions
    # -----------------------------------------------------------------------
    # For each shift, we use "flow" variables: f[s][i][j] = 1 if block j
    # directly follows block i in shift s.

    f: dict[str, dict[int, dict[tuple[int, int], cp_model.IntVar]]] = {}

    for stype in SHIFT_TYPES:
        f[stype] = {}
        for s_idx in range(max_shifts_per_type[stype]):
            f[stype][s_idx] = {}
            for i, j, ttype in pairs:
                var_name = f"f_{stype}_{s_idx}_{i}_{j}"
                f[stype][s_idx][(i, j)] = model.new_bool_var(var_name)

                # Flow can only exist if both blocks assigned to this shift
                model.add(f[stype][s_idx][(i, j)] <= x[stype][s_idx][i])
                model.add(f[stype][s_idx][(i, j)] <= x[stype][s_idx][j])

    # Each block (except the last) has at most one successor in the shift
    # Each block (except the first) has at most one predecessor in the shift
    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype]):
            for b in free_indices:
                # Outgoing: at most one successor
                outgoing = [f[stype][s_idx][(b, j)]
                            for j, _ in successors.get(b, [])
                            if (b, j) in f[stype][s_idx]]
                if outgoing:
                    model.add(sum(outgoing) <= 1)

                # Incoming: at most one predecessor
                incoming = [f[stype][s_idx][(i, b)]
                            for i, _ in predecessors.get(b, [])
                            if (i, b) in f[stype][s_idx]]
                if incoming:
                    model.add(sum(incoming) <= 1)

            # Number of flow edges = number of assigned blocks - 1
            # (if shift is active, blocks form a single chain)
            all_flows = list(f[stype][s_idx].values())
            all_blocks_in_shift = [x[stype][s_idx][b] for b in free_indices]

            if all_flows:
                # flows = assigned_blocks - active (i.e. chain of length k has k-1 edges)
                model.add(sum(all_flows) == sum(all_blocks_in_shift) - active[stype][s_idx])
            else:
                # No valid pairs => shift can have at most 1 block
                model.add(sum(all_blocks_in_shift) <= 1)

    # -----------------------------------------------------------------------
    # Constraint 5: Max shift duration
    # -----------------------------------------------------------------------
    for stype in SHIFT_TYPES:
        max_dur, _ = _shift_type_params(stype, params)
        for s_idx in range(max_shifts_per_type[stype]):
            # We track shift_start and shift_end using auxiliary variables
            # shift_start = min board_time of assigned blocks
            # shift_end = max alight_time of assigned blocks

            # Use big-M approach for start/end tracking
            all_board_times = [blocks[b].board_time for b in free_indices]
            all_alight_times = [blocks[b].alight_time for b in free_indices]
            M_start = max(all_board_times) if all_board_times else 86400
            M_end = max(all_alight_times) if all_alight_times else 86400

            shift_start = model.new_int_var(0, M_start, f"start_{stype}_{s_idx}")
            shift_end = model.new_int_var(0, M_end + 86400, f"end_{stype}_{s_idx}")

            for b in free_indices:
                blk = blocks[b]
                # If assigned: shift_start <= board_time
                model.add(shift_start <= blk.board_time).only_enforce_if(x[stype][s_idx][b])
                # If assigned: shift_end >= alight_time
                model.add(shift_end >= blk.alight_time).only_enforce_if(x[stype][s_idx][b])

            # If inactive, start=0 end=0
            model.add(shift_start == 0).only_enforce_if(active[stype][s_idx].negated())
            model.add(shift_end == 0).only_enforce_if(active[stype][s_idx].negated())

            # Duration constraint: end - start <= max_dur
            model.add(shift_end - shift_start <= max_dur)

    # -----------------------------------------------------------------------
    # Constraint 6: Continuous driving chain ≤ maxDrive
    # -----------------------------------------------------------------------
    # For continuous chains (same_route or cross_train), the total drive
    # must not exceed max_drive. We track this using chain variables.
    #
    # For each flow edge that is a same_route or cross_train transition,
    # the cumulative drive continues. For 'normal' transitions the chain resets.
    #
    # chain_drive[s][b] = cumulative driving time ending at block b in shift s
    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype]):
            chain_drive: dict[int, cp_model.IntVar] = {}
            for b in free_indices:
                blk = blocks[b]
                drive_dur = blk.alight_time - blk.board_time
                chain_drive[b] = model.new_int_var(
                    0, params.max_drive_seconds,
                    f"chain_{stype}_{s_idx}_{b}"
                )

                # Incoming continuous edges (same_route or cross_train)
                continuous_incoming = []
                normal_incoming = []
                for i, ttype in predecessors.get(b, []):
                    if (i, b) not in f[stype][s_idx]:
                        continue
                    edge_var = f[stype][s_idx][(i, b)]
                    gap = blk.board_time - blocks[i].alight_time
                    if ttype in ("same_route", "cross_train"):
                        continuous_incoming.append((i, edge_var, gap))
                    else:
                        normal_incoming.append(edge_var)

                # If block is the first in the shift (no incoming flow)
                # or after a normal transition: chain_drive[b] = drive_dur
                # If after a continuous transition: chain_drive[b] = chain_drive[prev] + gap + drive_dur

                has_incoming = [f[stype][s_idx][(i, b)]
                                for i, _ in predecessors.get(b, [])
                                if (i, b) in f[stype][s_idx]]

                if not continuous_incoming:
                    # chain_drive = drive_dur if assigned, 0 if not
                    model.add(chain_drive[b] == drive_dur).only_enforce_if(x[stype][s_idx][b])
                    model.add(chain_drive[b] == 0).only_enforce_if(x[stype][s_idx][b].negated())
                else:
                    # For each continuous predecessor, if that edge is active:
                    # chain_drive[b] = chain_drive[prev] + gap + drive_dur
                    for prev_idx, edge_var, gap in continuous_incoming:
                        model.add(
                            chain_drive[b] >= chain_drive[prev_idx] + gap + drive_dur
                        ).only_enforce_if(edge_var)

                    # If no continuous predecessor is active (first block or after normal):
                    no_continuous = [edge_var.negated() for _, edge_var, _ in continuous_incoming]
                    # Use an auxiliary bool
                    is_chain_start = model.new_bool_var(f"cs_{stype}_{s_idx}_{b}")
                    model.add_bool_and(no_continuous).only_enforce_if(is_chain_start)

                    # If chain_start and assigned: chain = drive_dur
                    both_start_assigned = model.new_bool_var(f"csa_{stype}_{s_idx}_{b}")
                    model.add_bool_and([is_chain_start, x[stype][s_idx][b]]).only_enforce_if(both_start_assigned)
                    model.add(chain_drive[b] == drive_dur).only_enforce_if(both_start_assigned)

                    # If not assigned: chain = 0
                    model.add(chain_drive[b] == 0).only_enforce_if(x[stype][s_idx][b].negated())

    # -----------------------------------------------------------------------
    # Constraint 7: Symmetry breaking — shifts of the same type are ordered
    # -----------------------------------------------------------------------
    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype] - 1):
            # If shift s_idx is inactive, shift s_idx+1 must also be inactive
            model.add_implication(active[stype][s_idx].negated(),
                                  active[stype][s_idx + 1].negated())

    # -----------------------------------------------------------------------
    # Constraint 8: Target shift counts (soft — enforced via objective penalties)
    # -----------------------------------------------------------------------
    total_active_by_type: dict[str, cp_model.LinearExpr] = {}
    for stype in SHIFT_TYPES:
        total_active_by_type[stype] = sum(
            active[stype][s_idx] for s_idx in range(max_shifts_per_type[stype])
        )

    # ========================================================================
    # Objective function
    # ========================================================================
    # Primary: maximize coverage (number of assigned blocks)
    # Secondary: penalize deviations from target shift counts
    # Tertiary: penalize short shifts

    COVERAGE_WEIGHT = 1000  # per block assigned
    TARGET_PENALTY = 50     # per shift over target
    MIN_DUR_PENALTY = 20    # per shift below minimum duration (soft)

    obj_terms = []

    # Maximize coverage
    for b in free_indices:
        obj_terms.append(COVERAGE_WEIGHT * y[b])

    # Penalize exceeding target shift counts
    for stype in SHIFT_TYPES:
        target_val = targets[stype]
        excess = model.new_int_var(0, max_shifts_per_type[stype], f"excess_{stype}")
        model.add(excess >= total_active_by_type[stype] - target_val)
        obj_terms.append(-TARGET_PENALTY * excess)

    # Penalize shifts below minimum duration (soft constraint)
    for stype in SHIFT_TYPES:
        _, min_dur = _shift_type_params(stype, params)
        for s_idx in range(max_shifts_per_type[stype]):
            # Compute total drive time for this shift
            total_drive = sum(
                (blocks[b].alight_time - blocks[b].board_time) * x[stype][s_idx][b]
                for b in free_indices
            )
            is_short = model.new_bool_var(f"short_{stype}_{s_idx}")
            # is_short = active AND total_drive < min_dur
            # Approximate: penalize if total drive < min_dur and shift is active
            # Use: total_drive < min_dur <=> min_dur - total_drive > 0
            shortfall = model.new_int_var(0, min_dur, f"shortfall_{stype}_{s_idx}")
            model.add(shortfall >= min_dur - total_drive).only_enforce_if(active[stype][s_idx])
            model.add(shortfall == 0).only_enforce_if(active[stype][s_idx].negated())
            # Penalize proportionally to shortfall (normalized)
            obj_terms.append(-MIN_DUR_PENALTY * shortfall // min_dur if min_dur > 0 else 0)

    model.maximize(sum(obj_terms))

    # ========================================================================
    # Solve
    # ========================================================================
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.num_workers = 4
    solver.parameters.log_search_progress = False

    status_code = solver.solve(model)

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    status_map = {
        cp_model.OPTIMAL: "optimal",
        cp_model.FEASIBLE: "feasible",
        cp_model.INFEASIBLE: "infeasible",
        cp_model.MODEL_INVALID: "infeasible",
        cp_model.UNKNOWN: "timeout",
    }
    status_str = status_map.get(status_code, "timeout")

    if status_code in (cp_model.INFEASIBLE, cp_model.MODEL_INVALID):
        feedback.append("Моделът е неосъществим — няма решение, което удовлетворява всички ограничения.")
        return SolveResponse(
            status=status_str,
            shifts=[],
            unassigned_block_indices=free_indices,
            objective_value=0,
            solve_time_ms=elapsed_ms,
            feedback=feedback,
        )

    if status_code == cp_model.UNKNOWN:
        feedback.append(f"Солвърът не намери решение в рамките на {timeout_seconds} секунди.")
        return SolveResponse(
            status="timeout",
            shifts=[],
            unassigned_block_indices=free_indices,
            objective_value=0,
            solve_time_ms=elapsed_ms,
            feedback=feedback,
        )

    # ========================================================================
    # Extract solution
    # ========================================================================
    result_shifts: list[ShiftAssignment] = []
    assigned_blocks: set[int] = set()

    for stype in SHIFT_TYPES:
        for s_idx in range(max_shifts_per_type[stype]):
            if not solver.value(active[stype][s_idx]):
                continue

            shift_blocks = []
            for b in free_indices:
                if solver.value(x[stype][s_idx][b]):
                    shift_blocks.append(b)
                    assigned_blocks.add(b)

            if shift_blocks:
                # Sort blocks by board_time
                shift_blocks.sort(key=lambda b: blocks[b].board_time)
                result_shifts.append(ShiftAssignment(
                    shift_type=stype,
                    block_indices=shift_blocks,
                ))

    unassigned = [b for b in free_indices if b not in assigned_blocks]

    # Build feedback
    type_names = {TYPE_MORNING: "сутрешни", TYPE_DAY: "дневни", TYPE_NIGHT: "нощни"}
    for stype in SHIFT_TYPES:
        count = sum(1 for s in result_shifts if s.shift_type == stype)
        target_val = targets[stype]
        if count > target_val and target_val > 0:
            feedback.append(
                f"Генерирани {count} {type_names[stype]} смени (цел: {target_val})."
            )

    if unassigned:
        feedback.append(f"Остават {len(unassigned)} неприсвоени блока.")

    coverage_pct = ((len(free_indices) - len(unassigned)) / len(free_indices) * 100
                    if free_indices else 100)
    feedback.append(f"Покритие: {coverage_pct:.1f}% ({len(free_indices) - len(unassigned)}/{len(free_indices)} блока)")

    return SolveResponse(
        status=status_str,
        shifts=result_shifts,
        unassigned_block_indices=unassigned,
        objective_value=solver.objective_value if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0,
        solve_time_ms=elapsed_ms,
        feedback=feedback,
    )
