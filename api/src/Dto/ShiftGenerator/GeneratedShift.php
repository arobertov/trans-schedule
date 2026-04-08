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
     * Check whether a given block can be added to this shift respecting
     * rest, crew-change, and duration constraints.
     */
    public function canAddBlock(DrivingBlock $block, GenerationParameters $params): bool
    {
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

        // For normal (same-train) handoffs enforce minimum rest period.
        // Cross-train handoffs only require gap >= 0 (already checked above).
        if (!$isCrossTrain && $gap < $params->minRestSeconds()) {
            return false;
        }

        // Station handoff: crew-change station or route endpoint (depot).
        // Cross-train handoffs skip this — the base-station match is sufficient.
        if (!$isCrossTrain) {
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
