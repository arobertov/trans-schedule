<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\ValidationResult;

/**
 * Port of python_shift_generator/validator.py
 *
 * Validates the generated shift schedule against the SAME dynamic limits
 * the user chose for generation.
 *
 * 7 checks:
 *  1. All driving blocks <= max_drive
 *  2. All rest periods >= min_rest
 *  3. Morning shift total <= max_morning
 *  4. Day/Night shift total <= max_day/max_night
 *  5. 100% route coverage (every block assigned exactly once)
 *  6. No overlapping assignments
 *  7. All crew changes at crew-change station or route endpoint (depot)
 */
final class ShiftValidator
{
    /**
     * @param GeneratedShift[]     $shifts
     * @param DrivingBlock[]       $allBlocks
     * @param GenerationParameters $params
     */
    public function validate(array $shifts, array $allBlocks, GenerationParameters $params): ValidationResult
    {
        $result = new ValidationResult();

        $this->checkDriveTime($shifts, $params, $result);
        $this->checkRestPeriods($shifts, $params, $result);
        $this->checkShiftDurations($shifts, $params, $result);
        $this->checkCoverage($shifts, $allBlocks, $result);
        $this->checkCrewChanges($shifts, $params, $result);

        return $result;
    }

    private function checkDriveTime(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $maxDrive = $params->maxDriveSeconds();
        $allOk = true;

        foreach ($shifts as $s) {
            foreach ($s->entries as $entry) {
                $b = $entry->block;
                if ($b->driveDuration() > $maxDrive) {
                    $result->error(sprintf(
                        '%s: блок на маршрут %s (%s-%s) превишава макс. шофиране: %s > %d:%02d',
                        $s->shiftId, $b->routeId, $b->boardTimeStr(), $b->alightTimeStr(),
                        $b->driveStr(), intdiv($params->maxDriveMinutes, 60), $params->maxDriveMinutes % 60,
                    ));
                    $allOk = false;
                }
            }
        }

        if ($allOk) {
            $result->warn(sprintf('OK Всички блокове <= %d:%02d', intdiv($params->maxDriveMinutes, 60), $params->maxDriveMinutes % 60));
        }
    }

    private function checkRestPeriods(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $minRest = $params->minRestSeconds();
        $allOk = true;

        foreach ($shifts as $s) {
            $entries = $s->entries;
            for ($i = 0, $len = \count($entries) - 1; $i < $len; $i++) {
                $curr = $entries[$i]->block;
                $next = $entries[$i + 1]->block;
                $rest = $next->boardTime - $curr->alightTime;

                // Cross-train handoff: different trains, same base station, not Depo — shorter gap is OK.
                if ($curr->train !== $next->train) {
                    $baseAlight = GenerationParameters::stationBase($curr->alightStation);
                    $baseBoard  = GenerationParameters::stationBase($next->boardStation);
                    if ($baseAlight !== 'Depo' && $baseAlight === $baseBoard
                        && $rest <= $params->crossTrainHandoffSeconds() && $rest >= 0) {
                        continue; // valid cross-train handoff — skip min rest check
                    }
                }

                if ($rest < $minRest) {
                    $result->error(sprintf(
                        '%s: почивка между маршрут %s(%s) и маршрут %s(%s) е %s < %d мин',
                        $s->shiftId, $curr->routeId, $curr->alightTimeStr(),
                        $next->routeId, $next->boardTimeStr(),
                        self::formatDuration($rest), $params->minRestMinutes,
                    ));
                    $allOk = false;
                }
            }
        }

        if ($allOk) {
            $result->warn(sprintf('OK Всички почивки >= %d мин', $params->minRestMinutes));
        }
    }

    private function checkShiftDurations(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $allOk = true;

        foreach ($shifts as $s) {
            $dur = $s->totalDuration();

            // Maximum checks
            if ($s->shiftType === GeneratedShift::TYPE_MORNING && $dur > $params->maxMorningSeconds()) {
                $result->error(sprintf(
                    '%s: сутрешна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxMorningMinutes, 60), $params->maxMorningMinutes % 60,
                ));
                $allOk = false;
            } elseif ($s->shiftType === GeneratedShift::TYPE_DAY && $dur > $params->maxDaySeconds()) {
                $result->error(sprintf(
                    '%s: дневна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxDayMinutes, 60), $params->maxDayMinutes % 60,
                ));
                $allOk = false;
            } elseif ($s->shiftType === GeneratedShift::TYPE_NIGHT && $dur > $params->maxNightSeconds()) {
                $result->error(sprintf(
                    '%s: нощна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxNightMinutes, 60), $params->maxNightMinutes % 60,
                ));
                $allOk = false;
            }

            // Minimum checks
            if ($s->shiftType === GeneratedShift::TYPE_MORNING && $dur < $params->minMorningSeconds()) {
                $result->warn(sprintf(
                    'WARN %s: сутрешна смяна (%s) е под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minMorningMinutes, 60), $params->minMorningMinutes % 60,
                ));
            } elseif ($s->shiftType === GeneratedShift::TYPE_DAY && $dur < $params->minDaySeconds()) {
                $result->warn(sprintf(
                    'WARN %s: кратка дневна смяна (%s) — под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minDayMinutes, 60), $params->minDayMinutes % 60,
                ));
            } elseif ($s->shiftType === GeneratedShift::TYPE_NIGHT && $dur < $params->minNightSeconds()) {
                $result->warn(sprintf(
                    'WARN %s: кратка нощна смяна (%s) — под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minNightMinutes, 60), $params->minNightMinutes % 60,
                ));
            }
        }

        if ($allOk) {
            $result->warn('OK Всички продължителности в рамките на лимитите');
        }
    }

    private function checkCoverage(array $shifts, array $allBlocks, ValidationResult $result): void
    {
        // Build assignments map
        $assigned = [];
        $duplicateErrors = false;

        foreach ($shifts as $s) {
            foreach ($s->entries as $entry) {
                $b = $entry->block;
                $key = $b->routeId . ':' . $b->blockIndex;
                if (isset($assigned[$key])) {
                    $result->error(sprintf(
                        'Блок маршрут=%s idx=%d е присвоен на %s И %s',
                        $b->routeId, $b->blockIndex, $assigned[$key], $s->shiftId,
                    ));
                    $duplicateErrors = true;
                } else {
                    $assigned[$key] = $s->shiftId;
                }
            }
        }

        if (!$duplicateErrors) {
            $result->warn('OK Няма дублирани присвоявания');
        }

        // Check all blocks are assigned
        $allBlockKeys = [];
        foreach ($allBlocks as $b) {
            $allBlockKeys[$b->routeId . ':' . $b->blockIndex] = true;
        }

        $missing = array_diff_key($allBlockKeys, $assigned);
        if (!empty($missing)) {
            foreach (array_keys($missing) as $key) {
                $result->error(sprintf('Блок НЕ е присвоен: %s', $key));
            }
        } else {
            $result->warn('OK 100%% покритие на маршрутите (без пропуски)');
        }

        $extra = array_diff_key($assigned, $allBlockKeys);
        foreach (array_keys($extra) as $key) {
            $result->error(sprintf('Непознат блок присвоен: %s', $key));
        }
    }

    private function checkCrewChanges(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $allOk = true;
        $stations = $params->crewChangeStations;

        foreach ($shifts as $s) {
            $entries = $s->entries;
            $count = \count($entries);

            for ($i = 0; $i < $count; $i++) {
                $b = $entries[$i]->block;

                // Check boarding point (for blocks after the first)
                if ($i > 0) {
                    $prev = $entries[$i - 1]->block;
                    $boardOk = $b->canCrewChangeAtBoard($stations) || $b->isBoardAtRouteEndpoint();

                    // Cross-train handoff: same base station (ignoring track №), not Depo, within time limit
                    if (!$boardOk) {
                        $gap = $b->boardTime - $prev->alightTime;
                        $boardOk = GenerationParameters::stationBase($prev->alightStation) !== 'Depo'
                            && GenerationParameters::stationBase($prev->alightStation) === GenerationParameters::stationBase($b->boardStation)
                            && $gap <= $params->crossTrainHandoffSeconds();
                    }

                    if (!$boardOk) {
                        $result->error(sprintf(
                            '%s: блок %d на маршрут %s се качва на \'%s\' (не е ст. за оборот, начална/крайна станция или съвместим кръстосан влак)',
                            $s->shiftId, $i, $b->routeId, $b->boardStation,
                        ));
                        $allOk = false;
                    }
                }

                // Check alighting point (for blocks before the last)
                if ($i < $count - 1) {
                    $next = $entries[$i + 1]->block;
                    $alightOk = $b->canCrewChangeAtAlight($stations) || $b->isAlightAtRouteEndpoint();

                    // Cross-train handoff
                    if (!$alightOk) {
                        $gap = $next->boardTime - $b->alightTime;
                        $alightOk = GenerationParameters::stationBase($b->alightStation) !== 'Depo'
                            && GenerationParameters::stationBase($b->alightStation) === GenerationParameters::stationBase($next->boardStation)
                            && $gap <= $params->crossTrainHandoffSeconds();
                    }

                    if (!$alightOk) {
                        $result->error(sprintf(
                            '%s: блок %d на маршрут %s слиза на \'%s\' (не е ст. за оборот, начална/крайна станция или съвместим кръстосан влак)',
                            $s->shiftId, $i, $b->routeId, $b->alightStation,
                        ));
                        $allOk = false;
                    }
                }
            }
        }

        if ($allOk) {
            $result->warn('OK Всички смени на екипаж на ст. за оборот, начална/крайна станция (депо) или кръстосан влак');
        }
    }

    private static function formatDuration(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv(abs($seconds) % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }
}
