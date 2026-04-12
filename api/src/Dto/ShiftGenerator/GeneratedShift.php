<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * A generated shift containing one or more driving blocks.
 *
 * Shift types:
 *   С = Morning (Сутрешна)
 *   Д = Day     (Дневна)
 *   Н = Night   (Нощна)
 */
final class GeneratedShift
{
    public const TYPE_MORNING = 'С';
    public const TYPE_DAY = 'Д';
    public const TYPE_NIGHT = 'Н';

    /** @var ShiftEntry[] */
    public array $entries = [];

    public function __construct(
        public readonly string $shiftId,
        public readonly string $shiftType,
    ) {
    }

    public function startTime(): int
    {
        return $this->entries ? $this->entries[0]->block->boardTime : 0;
    }

    public function endTime(): int
    {
        return $this->entries ? end($this->entries)->block->alightTime : 0;
    }

    public function totalDuration(): int
    {
        if (!$this->entries) {
            return 0;
        }

        return $this->endTime() - $this->startTime();
    }

    public function totalDrive(): int
    {
        $total = 0;
        foreach ($this->entries as $entry) {
            $total += $entry->block->driveDuration();
        }

        return $total;
    }

    public function lastBlock(): ?DrivingBlock
    {
        return $this->entries ? end($this->entries)->block : null;
    }

    /**
     * Compute the continuous driving time from the end of the shift backwards,
     * including all blocks chained via cross-train handoffs.
     *
     * Cross-train handoffs do NOT break continuous driving — the driver switches
     * trains without a real rest break (с едно качване кара два влака).
     * Only a gap > crossTrainHandoffSeconds (or same-train gap with full rest)
     * counts as a real break in the driving chain.
     */
    public function continuousDriveChainFromEnd(GenerationParameters $params): int
    {
        if (empty($this->entries)) {
            return 0;
        }

        $total = 0;
        for ($i = \count($this->entries) - 1; $i >= 0; $i--) {
            $block = $this->entries[$i]->block;
            $total += $block->driveDuration();

            if ($i > 0) {
                $prev = $this->entries[$i - 1]->block;
                $gap = $block->boardTime - $prev->alightTime;

                $isCross = $prev->train !== $block->train
                    && GenerationParameters::stationBase($prev->alightStation) !== 'Depo'
                    && GenerationParameters::stationBase($prev->alightStation) === GenerationParameters::stationBase($block->boardStation)
                    && $gap >= 0
                    && $gap <= $params->crossTrainHandoffSeconds();

                if ($isCross) {
                    // Handoff gap counts toward driving time
                    $total += $gap;
                    continue;
                }
                // Real rest — stop the chain
                break;
            }
        }

        return $total;
    }

    /**
     * Check whether a given block can be added to this shift respecting
     * rest, crew-change, duration, and time-boundary constraints.
     *
     * Cross-train handoff semantics: when a driver switches trains at a terminal
     * station without a real break, the handoff does NOT interrupt continuous
     * driving time. The total continuous drive chain must stay ≤ maxDrive.
     */
    public function canAddBlock(DrivingBlock $block, GenerationParameters $params): bool
    {
        // ── Shift time-boundary enforcement (applies to ALL blocks incl. first) ──
        // Morning shift must end by the morning deadline
        if ($this->shiftType === self::TYPE_MORNING
            && $block->alightTime > $params->morningEndTimeSeconds) {
            return false;
        }
        // Day shift: first block must start at/after day start; any block must end by day end
        if ($this->shiftType === self::TYPE_DAY) {
            if (!$this->entries && $block->boardTime < $params->dayStartTimeSeconds) {
                return false;
            }
            if ($block->alightTime > $params->dayEndTimeSeconds) {
                return false;
            }
        }

        if (!$this->entries) {
            return true;
        }

        $last = $this->lastBlock();
        $gap = $block->boardTime - $last->alightTime;

        // Block must start after previous ends
        if ($gap < 0) {
            return false;
        }

        // Detect cross-train handoff: different trains, same base station (ignoring
        // track _N suffix), NOT at Depo, gap within handoff limit.
        $isCrossTrain = false;
        if ($last->train !== $block->train) {
            $baseAlight = GenerationParameters::stationBase($last->alightStation);
            $baseBoard  = GenerationParameters::stationBase($block->boardStation);
            if ($baseAlight !== 'Depo' && $baseAlight === $baseBoard
                && $gap <= $params->crossTrainHandoffSeconds()) {
                $isCrossTrain = true;
            }
        }

        if ($isCrossTrain) {
            // Cross-train handoff: NOT a rest break — driving is continuous.
            // Check that the continuous drive chain doesn't exceed maxDrive.
            $chainDrive = $this->continuousDriveChainFromEnd($params) + $gap + $block->driveDuration();
            if ($chainDrive > $params->maxDriveSeconds()) {
                return false;
            }
        } else {
            // Normal transition: enforce minimum rest period
            if ($gap < $params->minRestSeconds()) {
                return false;
            }

            // Station handoff: crew-change station or route endpoint (depot)
            $stations = $params->crewChangeStations;
            $boardOk  = $block->canCrewChangeAtBoard($stations) || $block->isBoardAtRouteEndpoint();
            $alightOk = $last->canCrewChangeAtAlight($stations) || $last->isAlightAtRouteEndpoint();
            if (!$boardOk || !$alightOk) {
                return false;
            }
        }

        // Duration check per shift type
        $newTotal = $block->alightTime - $this->startTime();
        if ($this->shiftType === self::TYPE_MORNING && $newTotal > $params->maxMorningSeconds()) {
            return false;
        }
        if (\in_array($this->shiftType, [self::TYPE_DAY, self::TYPE_NIGHT], true)
            && $newTotal > $params->maxDaySeconds()) {
            return false;
        }

        return true;
    }

    public function addBlock(DrivingBlock $block): void
    {
        if ($this->entries) {
            $lastEntry = end($this->entries);
            $lastEntry->restAfter = $block->boardTime - $lastEntry->block->alightTime;
        }
        $this->entries[] = new ShiftEntry($block);
    }

    /**
     * Serialize for API response preview.
     */
    public function toPreviewArray(): array
    {
        $routes = [];
        foreach ($this->entries as $entry) {
            $routes[] = $entry->block->routeId;
        }

        return [
            'shift_id' => $this->shiftId,
            'shift_type' => $this->shiftType,
            'start' => $this->formatTimeOfDay($this->startTime()),
            'end' => $this->formatTimeOfDay($this->endTime()),
            'drive' => $this->formatDuration($this->totalDrive()),
            'total' => $this->formatDuration($this->totalDuration()),
            'blocks_count' => \count($this->entries),
            'routes' => array_values(array_unique($routes)),
        ];
    }

    private function formatTimeOfDay(int $seconds): string
    {
        $h = intdiv($seconds, 3600) % 24;
        $m = intdiv($seconds % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }

    private function formatDuration(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }
}
