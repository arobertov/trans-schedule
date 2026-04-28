---
description: "Use when working on the shift schedule generator: DTOs in api/src/Dto/ShiftGenerator, services in api/src/Service/ShiftGenerator, ShiftGeneratorController, ShiftScheduleStatus enum, or the frontend ShiftScheduleGenerator component. Covers algorithm phases, cross-train handoff semantics, block generation, validation rules, and parameter conventions."
name: "Shift Schedule Generator"
applyTo: "api/src/Dto/ShiftGenerator/**,api/src/Service/ShiftGenerator/**,api/src/Controller/ShiftGeneratorController.php,pwa/components/admin/shift_schedules/**"
---
# Shift Schedule Generator

## Pipeline Overview

```
TrainSchedule → ScheduleParser → BlockGenerator → ShiftAssigner → ShiftValidator → ShiftScheduleMapper
```

Orchestrated by `ShiftGeneratorService`, exposed via `ShiftGeneratorController`.

- **ScheduleParser**: Reads `TrainScheduleLine` entities → `RouteSegment[]`. Groups by train number, normalizes stations (strips `><` terminal markers, normalizes depot variants → `'Depo'`), handles midnight crossing, splits routes 101/102 by consecutive Depo entries into `-сутрин`/`-следобед`/`-нощен` segments.
- **BlockGenerator**: Splits `RouteSegment[]` into `DrivingBlock[]` using deterministic boundary-station cutting. Boundaries are crew-change stations (`14_1`, `14_2`) and route endpoints (Depo). Each block spans exactly one boundary-to-boundary segment (e.g. `Depo→14_1`, `14_1→14_2`). If the distance between two boundaries exceeds `maxDriveMinutes`, the segment is subdivided internally. ShiftAssigner then combines consecutive same-route blocks via same-route continuation up to `maxDriveMinutes`.
- **ShiftAssigner**: 6-phase greedy assignment of blocks → shifts (see Algorithm section).
- **ShiftValidator**: 7 validation checks on generated shifts (see Validation section).
- **ShiftScheduleMapper**: Persists `GeneratedShift[]` to `ShiftScheduleDetails` entities. Computes `at_doctor`, `at_duty_officer`, `night_work`, `zero_time`, route display names.
- **ShiftGeneratorService**: Orchestrator with `preview()` (dry-run) and `generate()` (persist as Draft).

## DTOs (`api/src/Dto/ShiftGenerator/`)

| DTO | Role |
|---|---|
| `Stop` | station (string) + time (int, seconds from midnight) |
| `RouteSegment` | Contiguous train route with stops. `routeId` = `"101-сутрин"` |
| `DrivingBlock` | Atomic driving segment within a route — assigned to exactly one shift |
| `ShiftEntry` | Wraps `DrivingBlock` with optional `restAfter` (seconds) |
| `GeneratedShift` | A shift containing `ShiftEntry[]`. Types: `С` (morning), `Д` (day), `Н` (night) |
| `GenerationParameters` | All tunable parameters with defaults (see Parameters section) |
| `ValidationResult` | Accumulates errors[] and warnings[] |
| `GenerationResult` | Full pipeline output: shifts, blocks, segments, validation, feedback |

## Cross-Train Handoff — Critical Semantics

A cross-train handoff means a driver **switches from one train to another without a real break**. The handoff gap is **continuous driving**, NOT rest.

Detection criteria (all must be true):
1. Previous block's train ≠ next block's train
2. Base stations match (after stripping `_N` track suffix via `stationBase()`)
3. Station is NOT Depo
4. Gap between blocks ≤ `crossTrainHandoffMinutes` (default 20)

Consequences:
- The handoff gap **counts toward the continuous drive chain** (drive + handoff gaps must stay ≤ `maxDriveMinutes`)
- **No minimum rest check** is applied at handoff points
- Crew-change station validation **skips** handoff transitions
- Method `continuousDriveChainFromEnd()` in `GeneratedShift` walks backward chaining cross-train blocks

**Never** treat cross-train handoff as rest. Do **not** add a `minHandoffRestMinutes` parameter — it was removed intentionally.

## Same-Route Continuation — Block Merging Semantics

A same-route continuation means two **consecutive blocks from the same route** (same `routeId`, `blockIndex` N and N+1) are joined in a shift. The boundary between them is an **artificial cut** placed by BlockGenerator at a crew-change station — the driver does NOT stop.

Detection criteria (all must be true):
1. Previous block's `routeId` === next block's `routeId`
2. Next block's `blockIndex` === previous block's `blockIndex` + 1
3. Gap between blocks ≤ 1 second (should be 0 — same time point)

Consequences:
- The gap **counts toward the continuous drive chain** (total chain must stay ≤ `maxDriveMinutes`)
- **No minimum rest check** is applied
- **No crew-change station validation** is applied (it's an internal boundary)
- ShiftAssigner greedily merges consecutive same-route blocks until `maxDriveMinutes` is reached

### Transition Type Summary

| Transition | Condition | Crew-change? | minRest? | Continuous driving? |
|---|---|---|---|---|
| **Normal** | Different routes or non-consecutive blocks | **Yes** | **Yes** | New chain |
| **Cross-train handoff** | Different train, same base station, ≤20min | No | No | **Yes** — continues chain |
| **Same-route continuation** | Same route, consecutive blockIndex, gap≈0 | No | No | **Yes** — continues chain |

### Example: Flexible Block Combination

Route `101-сутрин`: `Depo → ... → 14_1 → ... → 14_2 → ... → 14_1 → ... → Depo`

BlockGenerator creates minimal blocks:
- Block 0: `Depo→14_1` (45min)
- Block 1: `14_1→14_2` (55min)
- Block 2: `14_2→14_1` (50min)
- Block 3: `14_1→Depo` (40min)

ShiftAssigner can combine:
- Block 0 alone (45min) — minimal
- Block 0+1 via same-route continuation (100min)
- Block 0+1+2 via same-route continuation (150min = maxDrive limit)
- Block 3 must start a new chain (Block 2→3 would exceed maxDrive)

**Never** bypass `maxDriveMinutes` via same-route continuation. The continuous drive chain is always enforced.

## Station Naming Conventions

- Terminal markers `>` and `<` are stripped by `normalizeStation()` in ScheduleParser and `stationBase()` in GenerationParameters
- Track suffixes `_1`, `_2` etc. are stripped by `stationBase()` for base comparison
- Depot variants are normalized to canonical `'Depo'`
- Display mapping: `Depo → Депо`, crew-change stations → `crewChangeStationLabel` (default `'МС-14'`)
- Default crew-change stations: `['14_1', '14_2']`

## Algorithm: 6-Phase Greedy Assignment

### Phase 0: Combined Night Shifts (midnight crossing)
Algorithmic continuation, not hardcoded pairs. If the last block of a train route after `23:00` ends at a station that is not `Depo`, then on the next morning the algorithm must find the same station and assign the first departing train from that station to the same night shift, even if the train has a different route or train number. The continuation uses `+86400` time adjustment for the morning block and remains valid only if the resulting shift satisfies the configured rest and max-duration rules.

Selection rules for the morning continuation:
- only routes ending after `23:00` are eligible;
- the endpoint must be a station, not `Depo`;
- the next block must start from the same base station on the next morning;
- choose the earliest departing compatible block from that station;
- the train number does not need to match the previous route.

Shift numbering rules for algorithmic night continuations:
- the generated shift code should prefer the number of the station that determines the continuation when that does not violate shift-number uniqueness;
- shift numbers may leave the usual contiguous sequence if needed;
- for example, if night shifts are usually numbered from `1` to `15`, but the qualifying station is `18`, the assigned shift code may be `СМ18-Н`;
- uniqueness of shift IDs remains mandatory across the whole generated schedule.

### Phase 1: Classification
- Morning candidate: `boardTime < morningThresholdSeconds`
- Night candidate: `boardTime ≥ nightThresholdSeconds` AND route not in `EXCLUDED_FROM_NIGHT` (`101-evening`, `102-evening`)
- `$extendShift` closure: greedy extension — find compatible unassigned blocks sorted by earliest boardTime, add first match, repeat

### Phase 2: Morning Shifts
Pool morning candidates sorted by boardTime. For each (up to `targetMorningShifts` if set): create shift if `alightTime ≤ morningEndTimeSeconds`, extend greedily.

### Phase 3: Night Shifts
Pool night candidates sorted by boardTime. For each (up to `targetNightShifts`): create shift, extend with night-candidate-only filter.

### Phase 4: Day Shifts
Remaining unassigned blocks within `dayStartTime..dayEndTime`. Greedy extension stops at `dayTargetMinutes`. Reserves blocks for remaining target shifts.

### Phase 5: Sweep (leftover blocks)
- **Step A**: Try adding each leftover to an existing shift (preference: smallest time gap)
- **Step B**: Create new shifts for truly unassignable blocks. Type selection respects targets — if natural type's target is met, falls back in order: Day → Night → Morning

### Post-processing
- Records unassigned blocks and feedback messages (Bulgarian)
- Clears `restAfter` on last entry of each shift
- Sorts: Morning → Day → Night; within type by numeric shift code

## Validation: 7 Checks

| # | Check | Level |
|---|---|---|
| 1 | Continuous drive chains ≤ maxDrive (cross-train handoff gaps and same-route continuation gaps included in chain) | error |
| 2 | Rest periods ≥ minRest (cross-train handoffs and same-route continuations skipped — not rest) | error |
| 3 | Max shift duration per type | error |
| 4 | Min shift duration per type | warning |
| 5 | 100% block coverage | error |
| 6 | No duplicate block assignments | error |
| 7 | Crew changes at allowed stations (handoff and same-route transitions skipped) | error |

## Key Parameters (GenerationParameters defaults)

| Parameter | Default | Purpose |
|---|---|---|
| `maxDriveMinutes` | 150 | Max continuous driving (chain) |
| `minDriveMinutes` | 60 | Preferred min block size |
| `minRestMinutes` | 50 | Min rest between blocks |
| `crossTrainHandoffMinutes` | 20 | Max gap for cross-train handoff |
| `maxMorningMinutes` | 300 (5h) | Morning shift max duration |
| `maxDayMinutes`/`maxNightMinutes` | 660 (11h) | Day/Night shift max duration |
| `minMorningMinutes` | 180 (3h) | Morning shift min (warning) |
| `minDayMinutes`/`minNightMinutes` | 480 (8h) | Day/Night shift min (warning) |
| `morningThresholdSeconds` | 09:30 | Morning candidate cutoff |
| `nightThresholdSeconds` | 16:30 | Night candidate cutoff |
| `morningEndTimeSeconds` | 10:30 | Morning shift hard deadline |
| `dayStartTimeSeconds` | 06:00 | Day shift earliest start |
| `dayEndTimeSeconds` | 23:00 | Day shift latest end |
| `dayTargetMinutes` | 540 (9h) | Day shift greedy stop |
| `doctorOffsetMinutes` | 30 | Pre-shift medical check |
| `dutyOfficerOffsetMinutes` | 15 | Pre-shift duty officer |
| `crewChangeStations` | `['14_1','14_2']` | Crew handoff stations |
| `targetMorning/Day/NightShifts` | 0 (auto) | Target counts (0 = unlimited) |

## Controller Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/shift_schedules/generate/preview` | Dry-run: returns shifts + validation |
| POST | `/api/shift_schedules/generate` | Full pipeline + persist as DRAFT |
| POST | `/api/shift_schedules/{id}/approve` | Draft → Active status change |

## Frontend Component (`ShiftScheduleGenerator.tsx`)

- 5 form sections: Input, Output, Block params, Shift params, Output params
- DEFAULTS mirror backend defaults
- Shift types displayed: С (сутрин/morning), Д (дневна/day), Н (нощна/night)
- All labels and feedback in Bulgarian
- Uses `NEXT_PUBLIC_ENTRYPOINT` for API calls

## Conventions

- Shift types: `С` = morning, `Д` = day, `Н` = night (Bulgarian abbreviations)
- Shift IDs: format `СМ{n}-С`, `СМ{n}-Д`, `СМ{n}-Н`
- Times stored as seconds from midnight internally; display as HH:MM
- Midnight crossing: times after midnight get +86400
- Feedback messages always in Bulgarian
- Entity properties use snake_case
- `stationBase()` is the canonical station normalizer — always use it for station comparison
- Block identity key: `"{routeId}:{blockIndex}"`
