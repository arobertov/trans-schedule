<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;

/**
 * Port of python_shift_generator/shift_scheduler.py
 *
 * Assigns driving blocks to shifts using a 5-phase greedy algorithm.
 * All thresholds and limits come from GenerationParameters (dynamic).
 *
 * Phase 0: Combined night shifts crossing midnight (107→100, 108→101-morning)
 * Phase 1: Classify remaining blocks as morning / day / night candidates
 * Phase 2: Build morning shifts (exact target count when specified)
 * Phase 3: Build night shifts (exact target count when specified)
 * Phase 4: Build day shifts from remaining blocks (exact target count when specified)
 *
 * Cross-train chaining: blocks from different trains can be combined into
 * the same shift when they share the same base station (ignoring track №)
 * and the time gap is within cross_train_handoff_minutes.
 */
final class ShiftAssigner
{
    // Hardcoded structural configuration (not parameterized)
    private const COMBINED_NIGHT_ROUTES = [
        ['107', '100'],
        ['108', '101-morning'],
    ];
    private const EXCLUDED_FROM_NIGHT = ['101-evening', '102-evening'];

    /** @var DrivingBlock[] Blocks that couldn't be assigned */
    private array $unassignedBlocks = [];

    /** @var string[] Feedback messages about assignment issues */
    private array $feedback = [];

    /**
     * @return DrivingBlock[]
     */
    public function getUnassignedBlocks(): array
    {
        return $this->unassignedBlocks;
    }

    /**
     * @return string[]
     */
    public function getFeedback(): array
    {
        return $this->feedback;
    }

    /**
     * @param DrivingBlock[]       $allBlocks
     * @param GenerationParameters $params
     * @return GeneratedShift[]
     */
    public function assign(array $allBlocks, GenerationParameters $params): array
    {
        $this->unassignedBlocks = [];
        $this->feedback = [];

        $morningCounter = 0;
        $dayCounter = 0;
        $nightCounter = 0;

        $newShift = function (string $type) use (&$morningCounter, &$dayCounter, &$nightCounter): GeneratedShift {
            return match ($type) {
                GeneratedShift::TYPE_MORNING => new GeneratedShift(
                    'СМ' . (++$morningCounter) . '-' . GeneratedShift::TYPE_MORNING,
                    GeneratedShift::TYPE_MORNING,
                ),
                GeneratedShift::TYPE_DAY => new GeneratedShift(
                    'СМ' . (++$dayCounter) . '-' . GeneratedShift::TYPE_DAY,
                    GeneratedShift::TYPE_DAY,
                ),
                default => new GeneratedShift(
                    'СМ' . (++$nightCounter) . '-' . GeneratedShift::TYPE_NIGHT,
                    GeneratedShift::TYPE_NIGHT,
                ),
            };
        };

        /** @var DrivingBlock[] $unassigned keyed by spl_object_id for fast removal */
        $unassigned = [];
        foreach ($allBlocks as $block) {
            $unassigned[spl_object_id($block)] = $block;
        }

        $shifts = [];

        $popBlock = function (DrivingBlock $b) use (&$unassigned): void {
            unset($unassigned[spl_object_id($b)]);
        };

        $lastBlockOf = function (string $routeId) use (&$unassigned): ?DrivingBlock {
            $best = null;
            foreach ($unassigned as $b) {
                if ($b->routeId === $routeId && ($best === null || $b->blockIndex > $best->blockIndex)) {
                    $best = $b;
                }
            }

            return $best;
        };

        $firstBlockOf = function (string $routeId) use (&$unassigned): ?DrivingBlock {
            $best = null;
            foreach ($unassigned as $b) {
                if ($b->routeId === $routeId && ($best === null || $b->blockIndex < $best->blockIndex)) {
                    $best = $b;
                }
            }

            return $best;
        };

        // ── Phase 0: Combined Night shifts crossing midnight ──
        foreach (self::COMBINED_NIGHT_ROUTES as [$routeA, $routeB]) {
            $lastA = $lastBlockOf($routeA);
            $firstB = $firstBlockOf($routeB);
            if ($lastA === null || $firstB === null) {
                continue;
            }

            // Adjust first_b time to next day
            $adjustedB = new DrivingBlock(
                routeId: $firstB->routeId,
                train: $firstB->train,
                blockIndex: $firstB->blockIndex,
                boardStation: $firstB->boardStation,
                boardTime: $firstB->boardTime + 86400,
                alightStation: $firstB->alightStation,
                alightTime: $firstB->alightTime + 86400,
                routeStartStation: $firstB->routeStartStation,
                routeEndStation: $firstB->routeEndStation,
            );

            $rest = $adjustedB->boardTime - $lastA->alightTime;
            $total = $adjustedB->alightTime - $lastA->boardTime;
            if ($rest >= $params->minRestSeconds() && $total <= $params->maxNightSeconds()) {
                $s = $newShift(GeneratedShift::TYPE_NIGHT);
                $s->addBlock($lastA);
                $s->addBlock($adjustedB);
                $popBlock($lastA);
                $popBlock($firstB);
                $shifts[] = $s;
            }
        }

        // ── Phase 1: Classification helpers ──
        $isMorningCandidate = function (DrivingBlock $b) use ($params): bool {
            if ($b->boardTime >= $params->morningThresholdSeconds) {
                return false;
            }
            if (!$params->isCrewChangeStation($b->boardStation) || $b->isBoardAtRouteEndpoint()) {
                return true; // Depot/route-endpoint first block
            }

            return $b->boardTime < $params->morningStation14ThresholdSeconds;
        };

        $isNightCandidate = function (DrivingBlock $b) use ($params): bool {
            if (\in_array($b->routeId, self::EXCLUDED_FROM_NIGHT, true)) {
                return false;
            }

            return $b->boardTime >= $params->nightThresholdSeconds;
        };

        // Helper: extend a shift greedily with compatible blocks
        $extendShift = function (GeneratedShift $s, array &$unassigned, GenerationParameters $params, ?callable $filter = null) use ($popBlock): void {
            while (true) {
                $last = $s->lastBlock();
                if ($last === null) {
                    break;
                }
                $candidates = array_values(array_filter(
                    $unassigned,
                    fn(DrivingBlock $b) =>
                        $b->boardTime >= $last->alightTime
                        && $s->canAddBlock($b, $params)
                        && ($filter === null || $filter($b))
                ));
                usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

                if (empty($candidates)) {
                    break;
                }

                $chosen = $candidates[0];
                $s->addBlock($chosen);
                $popBlock($chosen);
            }
        };

        // ── Phase 2: Morning shifts ──
        $morningPool = array_values(array_filter($unassigned, $isMorningCandidate));
        usort($morningPool, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

        $processedMorningKeys = [];
        $targetMorning = $params->targetMorningShifts;

        foreach ($morningPool as $mb) {
            if ($targetMorning > 0 && $morningCounter >= $targetMorning) {
                break;
            }

            $key = $mb->routeId . ':' . $mb->blockIndex;
            if (isset($processedMorningKeys[$key]) || !isset($unassigned[spl_object_id($mb)])) {
                continue;
            }

            $s = $newShift(GeneratedShift::TYPE_MORNING);
            $s->addBlock($mb);
            $processedMorningKeys[$key] = true;
            $popBlock($mb);

            // Extend greedily with compatible blocks (including cross-train handoffs)
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use (&$processedMorningKeys) {
                $k = $b->routeId . ':' . $b->blockIndex;
                if (isset($processedMorningKeys[$k])) {
                    return false;
                }
                $processedMorningKeys[$k] = true;

                return true;
            });

            $shifts[] = $s;
        }

        // ── Phase 3: Night shifts ──
        $nightPool = array_values(array_filter($unassigned, $isNightCandidate));
        usort($nightPool, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

        $processedNightKeys = [];
        $targetNight = $params->targetNightShifts;

        foreach ($nightPool as $nb) {
            if ($targetNight > 0 && $nightCounter >= $targetNight) {
                break;
            }

            $key = $nb->routeId . ':' . $nb->blockIndex;
            if (isset($processedNightKeys[$key]) || !isset($unassigned[spl_object_id($nb)])) {
                continue;
            }

            $s = $newShift(GeneratedShift::TYPE_NIGHT);
            $s->addBlock($nb);
            $processedNightKeys[$key] = true;
            $popBlock($nb);

            // Extend greedily with more night blocks
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use ($isNightCandidate, &$processedNightKeys) {
                if (!$isNightCandidate($b)) {
                    return false;
                }
                $k = $b->routeId . ':' . $b->blockIndex;
                if (isset($processedNightKeys[$k])) {
                    return false;
                }
                $processedNightKeys[$k] = true;

                return true;
            });

            $shifts[] = $s;
        }

        // ── Phase 4: Day shifts (all remaining blocks) ──
        $targetDay = $params->targetDayShifts;

        while (!empty($unassigned)) {
            if ($targetDay > 0 && $dayCounter >= $targetDay) {
                break;
            }

            $daySorted = array_values($unassigned);
            usort($daySorted, fn(DrivingBlock $a, DrivingBlock $b) =>
                $a->boardTime <=> $b->boardTime ?: strcmp($a->routeId, $b->routeId)
            );

            $first = $daySorted[0];
            $s = $newShift(GeneratedShift::TYPE_DAY);
            $s->addBlock($first);
            $popBlock($first);

            // Extend greedily, stop at day_target duration OR when min_day is reached and we need to save blocks for remaining shifts
            while (true) {
                $last = $s->lastBlock();
                if ($last === null) {
                    break;
                }
                $earliestNext = $last->alightTime;
                $candidates = array_values(array_filter(
                    $unassigned,
                    fn(DrivingBlock $b) =>
                        $b->boardTime >= $earliestNext
                        && $s->canAddBlock($b, $params)
                ));
                usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) =>
                    $a->boardTime <=> $b->boardTime ?: strcmp($a->routeId, $b->routeId)
                );

                if (empty($candidates)) {
                    break;
                }

                // If we have a target day count and enough blocks remain for other shifts,
                // stop extending once we're past the minimum duration
                if ($targetDay > 0 && $s->totalDuration() >= $params->minDaySeconds()) {
                    $remainingShiftsNeeded = $targetDay - $dayCounter;
                    if ($remainingShiftsNeeded > 1 && \count($unassigned) <= $remainingShiftsNeeded * 2) {
                        break;
                    }
                }

                $chosen = $candidates[0];
                $s->addBlock($chosen);
                $popBlock($chosen);

                if ($s->totalDuration() >= $params->dayTargetSeconds()) {
                    break;
                }
            }

            $shifts[] = $s;
        }

        // Track unassigned blocks and generate feedback
        if (!empty($unassigned)) {
            $this->unassignedBlocks = array_values($unassigned);
            foreach ($this->unassignedBlocks as $b) {
                $this->feedback[] = sprintf(
                    'Блок маршрут %s (влак %d), %s→%s [%s-%s] не е присвоен — няма съвместима смяна в рамките на зададения брой',
                    $b->routeId, $b->train, $b->boardStation, $b->alightStation,
                    $b->boardTimeStr(), $b->alightTimeStr(),
                );
            }
        }

        // Check minimum duration and generate feedback
        foreach ($shifts as $s) {
            $dur = $s->totalDuration();
            $minDur = match ($s->shiftType) {
                GeneratedShift::TYPE_MORNING => $params->minMorningSeconds(),
                GeneratedShift::TYPE_DAY => $params->minDaySeconds(),
                GeneratedShift::TYPE_NIGHT => $params->minNightSeconds(),
                default => 0,
            };
            if ($minDur > 0 && $dur < $minDur) {
                $typeLabel = match ($s->shiftType) {
                    GeneratedShift::TYPE_MORNING => 'сутрешна',
                    GeneratedShift::TYPE_DAY => 'дневна',
                    GeneratedShift::TYPE_NIGHT => 'нощна',
                    default => '',
                };
                $this->feedback[] = sprintf(
                    '%s: %s смяна е %d:%02d — под минимума %d:%02d. Препоръчва се добавяне на блокове или промяна на параметрите.',
                    $s->shiftId, $typeLabel,
                    intdiv($dur, 3600), intdiv($dur % 3600, 60),
                    intdiv($minDur, 3600), intdiv($minDur % 3600, 60),
                );
            }
        }

        // Check strict shift count compliance
        if ($targetMorning > 0 && $morningCounter !== $targetMorning) {
            $this->feedback[] = sprintf(
                'Зададени %d сутрешни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetMorning, $morningCounter,
            );
        }
        if ($targetDay > 0 && $dayCounter !== $targetDay) {
            $this->feedback[] = sprintf(
                'Зададени %d дневни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetDay, $dayCounter,
            );
        }
        if ($targetNight > 0 && $nightCounter !== $targetNight) {
            $this->feedback[] = sprintf(
                'Зададени %d нощни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetNight, $nightCounter,
            );
        }

        // Fix rest_after on last entry of each shift
        foreach ($shifts as $s) {
            if (!empty($s->entries)) {
                $lastEntry = end($s->entries);
                $lastEntry->restAfter = null;
            }
        }

        return $shifts;
    }
}
