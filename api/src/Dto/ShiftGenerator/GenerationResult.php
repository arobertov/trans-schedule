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

        $allBlocks = [];
        foreach ($this->blocks as $b) {
            $allBlocks[] = [
                'route_id' => $b->routeId,
                'train' => $b->train,
                'block_index' => $b->blockIndex,
                'board_station' => $b->boardStation,
                'board_time' => $b->boardTimeStr(),
                'alight_station' => $b->alightStation,
                'alight_time' => $b->alightTimeStr(),
                'drive_time' => $b->driveStr(),
                'route_start_station' => $b->routeStartStation,
                'route_end_station' => $b->routeEndStation,
            ];
        }

        $unassigned = [];
        $unassignedSummary = [
            GeneratedShift::TYPE_MORNING => 0,
            GeneratedShift::TYPE_DAY => 0,
            GeneratedShift::TYPE_NIGHT => 0,
        ];
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

            $type = match (true) {
                $b->boardTime <= $this->parameters->morningThresholdSeconds => GeneratedShift::TYPE_MORNING,
                $b->boardTime >= $this->parameters->nightThresholdSeconds => GeneratedShift::TYPE_NIGHT,
                default => GeneratedShift::TYPE_DAY,
            };
            $unassignedSummary[$type]++;
        }

        return [
            'shifts_count' => $this->shiftsCount(),
            'morning_count' => $this->morningCount(),
            'day_count' => $this->dayCount(),
            'night_count' => $this->nightCount(),
            'blocks_count' => \count($this->blocks),
            'blocks' => $allBlocks,
            'validation' => $this->validation->toArray(),
            'shifts_preview' => $preview,
            'unassigned_blocks' => $unassigned,
            'unassigned_summary' => [
                'morning' => $unassignedSummary[GeneratedShift::TYPE_MORNING],
                'day' => $unassignedSummary[GeneratedShift::TYPE_DAY],
                'night' => $unassignedSummary[GeneratedShift::TYPE_NIGHT],
            ],
            'feedback' => $this->feedback,
            'parameters_used' => $this->parameters->toArray(),
        ];
    }
}
