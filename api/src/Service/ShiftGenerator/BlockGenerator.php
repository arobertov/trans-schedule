<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\RouteSegment;

/**
 * Port of python_shift_generator/block_generator.py
 *
 * Splits each route segment into driving blocks using a greedy approach:
 * - From each block start, find the latest crew-change / route-endpoint stop within MAX_DRIVE.
 * - Blocks start/end at crew-change stations or route endpoints (first/last station = depot).
 */
final class BlockGenerator
{
    /**
     * @param RouteSegment[]       $segments
     * @param GenerationParameters $params
     * @return DrivingBlock[]
     */
    public function generateAll(array $segments, GenerationParameters $params): array
    {
        $allBlocks = [];
        foreach ($segments as $segment) {
            $blocks = $this->generateBlocks($segment, $params);
            array_push($allBlocks, ...$blocks);
        }

        return $allBlocks;
    }

    /**
     * @return DrivingBlock[]
     */
    public function generateBlocks(RouteSegment $segment, GenerationParameters $params): array
    {
        $stops = $segment->stops;
        if (\count($stops) < 2) {
            return [];
        }

        $maxDrive = $params->maxDriveSeconds();
        $lastIdx = \count($stops) - 1;
        $routeStart = $segment->startStation();
        $routeEnd = $segment->endStation();
        $blocks = [];
        $blockIndex = 0;
        $startIdx = 0;

        while ($startIdx < \count($stops) - 1) {
            $startStop = $stops[$startIdx];
            $deadline = $startStop->time + $maxDrive;

            // Find the latest crew-change / route-endpoint stop within the deadline
            $bestEndIdx = -1;
            for ($i = $startIdx + 1; $i < \count($stops); $i++) {
                $stop = $stops[$i];
                if ($stop->time > $deadline) {
                    break;
                }
                if ($params->isCrewChangeStation($stop->station) || $i === $lastIdx || $i === 0) {
                    $bestEndIdx = $i;
                }
            }

            if ($bestEndIdx === -1) {
                // No valid crew-change stop found within window; fall back to next stop
                $bestEndIdx = $startIdx + 1;
            }

            $endStop = $stops[$bestEndIdx];

            // Prefer to end at a crew-change station (not route endpoint) unless it's the last stop
            if (!$params->isCrewChangeStation($endStop->station) && $bestEndIdx !== $lastIdx) {
                for ($i = $bestEndIdx - 1; $i > $startIdx; $i--) {
                    if ($params->isCrewChangeStation($stops[$i]->station)) {
                        $bestEndIdx = $i;
                        $endStop = $stops[$i];
                        break;
                    }
                }
            }

            $blocks[] = new DrivingBlock(
                routeId: $segment->routeId,
                train: $segment->train,
                blockIndex: $blockIndex,
                boardStation: $startStop->station,
                boardTime: $startStop->time,
                alightStation: $endStop->station,
                alightTime: $endStop->time,
                routeStartStation: $routeStart,
                routeEndStation: $routeEnd,
            );
            $blockIndex++;

            if ($bestEndIdx === $lastIdx) {
                break; // reached end of route
            }

            $startIdx = $bestEndIdx;
        }

        return $blocks;
    }
}
