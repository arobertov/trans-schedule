<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * Full result from the shift generation pipeline.
 */
final class GenerationResult
{
    /**
     * @param GeneratedShift[]      $shifts
     * @param DrivingBlock[]        $blocks
     * @param RouteSegment[]        $segments
     * @param ValidationResult      $validation
     * @param GenerationParameters  $parameters
     * @param DrivingBlock[]        $unassignedBlocks
     * @param string[]              $feedback
     */
    public function __construct(
        public readonly array $shifts,
        public readonly array $blocks,
        public readonly array $segments,
        public readonly ValidationResult $validation,
        public readonly GenerationParameters $parameters,
        public readonly array $unassignedBlocks = [],
        public readonly array $feedback = [],
    ) {
    }

    public function shiftsCount(): int
    {
        return \count($this->shifts);
    }

    public function morningCount(): int
    {
        return \count(array_filter($this->shifts, fn(GeneratedShift $s) => $s->shiftType === GeneratedShift::TYPE_MORNING));
    }

    public function dayCount(): int
    {
        return \count(array_filter($this->shifts, fn(GeneratedShift $s) => $s->shiftType === GeneratedShift::TYPE_DAY));
    }

    public function nightCount(): int
    {
        return \count(array_filter($this->shifts, fn(GeneratedShift $s) => $s->shiftType === GeneratedShift::TYPE_NIGHT));
    }

    public function toArray(): array
    {
        $preview = [];
        foreach ($this->shifts as $shift) {
            $preview[] = $shift->toPreviewArray();
        }

        $unassigned = [];
        foreach ($this->unassignedBlocks as $b) {
            $unassigned[] = [
                'route_id' => $b->routeId,
                'train' => $b->train,
                'block_index' => $b->blockIndex,
                'board_station' => $b->boardStation,
                'board_time' => $b->boardTimeStr(),
                'alight_station' => $b->alightStation,
                'alight_time' => $b->alightTimeStr(),
            ];
        }

        return [
            'shifts_count' => $this->shiftsCount(),
            'morning_count' => $this->morningCount(),
            'day_count' => $this->dayCount(),
            'night_count' => $this->nightCount(),
            'validation' => $this->validation->toArray(),
            'shifts_preview' => $preview,
            'unassigned_blocks' => $unassigned,
            'feedback' => $this->feedback,
            'parameters_used' => $this->parameters->toArray(),
        ];
    }
}
