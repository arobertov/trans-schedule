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
- **BlockGenerator**: Splits `RouteSegment[]` into `DrivingBlock[]` — the atomic assignment unit. Greedy forward scan: maximize block length within `maxDriveMinutes`, prefer crew-change stations as boundaries. Backward scan respects `minDriveMinutes`.
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

## Station Naming Conventions

- Terminal markers `>` and `<` are stripped by `normalizeStation()` in ScheduleParser and `stationBase()` in GenerationParameters
- Track suffixes `_1`, `_2` etc. are stripped by `stationBase()` for base comparison
- Depot variants are normalized to canonical `'Depo'`
- Display mapping: `Depo → Депо`, crew-change stations → `crewChangeStationLabel` (default `'МС-14'`)
- Default crew-change stations: `['14_1', '14_2']`

## Algorithm: 6-Phase Greedy Assignment

### Phase 0: Combined Night Shifts (midnight crossing)
Hardcoded pairs: `107→100`, `108→101-morning`. Takes last block of route A + first block of route B (with +86400 time adjustment). Creates night shift if rest ≥ minRest and total ≤ maxNight.

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
| 1 | Continuous drive chains ≤ maxDrive (cross-train handoff gaps included in chain) | error |
| 2 | Rest periods ≥ minRest (cross-train handoffs skipped — not rest) | error |
| 3 | Max shift duration per type | error |
| 4 | Min shift duration per type | warning |
| 5 | 100% block coverage | error |
| 6 | No duplicate block assignments | error |
| 7 | Crew changes at allowed stations (handoff transitions skipped) | error |

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
