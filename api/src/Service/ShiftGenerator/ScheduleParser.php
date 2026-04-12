<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\RouteSegment;
use App\Dto\ShiftGenerator\Stop;
use App\Entity\TrainSchedule;
use App\Entity\TrainScheduleLine;

/**
 * Port of python_shift_generator/schedule_parser.py
 *
 * Reads TrainScheduleLine entities from a TrainSchedule, groups by train number,
 * handles midnight crossing, and splits routes 101/102 by consecutive Depo entries.
 *
 * @return RouteSegment[]
 */
final class ScheduleParser
{
    /**
     * @return RouteSegment[]
     */
    public function parse(TrainSchedule $schedule): array
    {
        // Group lines by train_number, preserving insertion order
        /** @var array<string, list<array{station: string, time: string}>> $raw */
        $raw = [];

        /** @var TrainScheduleLine $line */
        foreach ($schedule->getLines() as $line) {
            $trainNumber = $line->getTrainNumber();
            $station = $this->normalizeStation(trim($line->getStationTrack()));

            // Use arrival_time if available, otherwise departure_time
            $arrival = $line->getArrivalTime();
            $departure = $line->getDepartureTime();
            $timeObj = $arrival ?? $departure;

            if ($timeObj === null) {
                continue;
            }

            $timeStr = $timeObj->format('H:i');

            $raw[$trainNumber][] = [
                'station' => $station,
                'time' => $timeStr,
            ];
        }

        // Sort train numbers numerically
        uksort($raw, fn(string $a, string $b) => (int) $a <=> (int) $b);

        $segments = [];
        foreach ($raw as $trainNumber => $stops) {
            $train = (int) $trainNumber;
            $routeSegments = $this->splitRouteByDepo($train, $stops);
            array_push($segments, ...$routeSegments);
        }

        return $segments;
    }

    /**
     * Split a route into segments wherever there are consecutive Depo entries.
     * Routes 101 and 102 have a mid-day depot break.
     *
     * @param int $train
     * @param list<array{station: string, time: string}> $rawStops
     * @return RouteSegment[]
     */
    private function splitRouteByDepo(int $train, array $rawStops): array
    {
        if (\count($rawStops) < 2) {
            return [];
        }

        // Find depot-to-depot break indices
        $breakIndices = [];
        for ($i = 0, $len = \count($rawStops) - 1; $i < $len; $i++) {
            if ($rawStops[$i]['station'] === 'Depo' && $rawStops[$i + 1]['station'] === 'Depo') {
                $breakIndices[] = $i;
            }
        }

        if (empty($breakIndices)) {
            // Single segment
            $seg = new RouteSegment((string) $train, $train);
            $prevTime = null;
            foreach ($rawStops as $row) {
                $t = $this->parseTime($row['time'], $prevTime);
                $seg->stops[] = new Stop($row['station'], $t);
                $prevTime = $t;
            }

            return [$seg];
        }

        // Multiple segments
        $suffixMap = [0 => '-сутрин', 1 => '-следобед', 2 => '-нощен'];
        $groups = [];
        $start = 0;
        foreach ($breakIndices as $bi) {
            $groups[] = \array_slice($rawStops, $start, $bi - $start + 1);
            $start = $bi + 1;
        }
        $groups[] = \array_slice($rawStops, $start);

        $segments = [];
        foreach ($groups as $idx => $group) {
            $suffix = $suffixMap[$idx] ?? "-seg{$idx}";
            $seg = new RouteSegment("{$train}{$suffix}", $train);
            $prevTime = null;
            foreach ($group as $row) {
                $t = $this->parseTime($row['time'], $prevTime);
                $seg->stops[] = new Stop($row['station'], $t);
                $prevTime = $t;
            }
            if (\count($seg->stops) >= 2) {
                $segments[] = $seg;
            }
        }

        return $segments;
    }

    /**
     * Normalize station name:
     * - Strips leading terminal markers (> for first stop, < for last stop)
     * - Normalizes depot variants → canonical 'Depo'
     */
    private function normalizeStation(string $station): string
    {
        // Strip terminal markers added by the schedule data
        $station = ltrim($station, '><');

        $lower = mb_strtolower($station, 'UTF-8');

        if ($lower === 'depo' || $lower === 'depot' || $lower === 'депо') {
            return 'Depo';
        }

        return $station;
    }

    /**
     * Parse HH:MM string to seconds from midnight, handling midnight crossing.
     */
    private function parseTime(string $timeStr, ?int $prevTime): int
    {
        $parts = explode(':', trim($timeStr));
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);
        $t = $h * 3600 + $m * 60;

        // Handle midnight crossing: if time is much earlier than previous, assume next day
        if ($prevTime !== null && $t < $prevTime - 300) {
            $t += 86400; // add 24 hours
        }

        return $t;
    }
}
