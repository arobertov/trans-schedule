<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\ShiftEntry;
use App\Entity\ShiftScheduleDetails;
use App\Entity\ShiftSchedules;

/**
 * Maps GeneratedShift objects to ShiftScheduleDetails entities ready for persistence.
 *
 * Computes:
 *  - at_doctor / at_duty_officer from configurable offsets before shift start
 *  - shift_end from the last block's alight time
 *  - worked_time from total shift duration
 *  - night_work from blocks falling in the configurable night window
 *  - zero_time = total_duration - total_drive (idle minutes)
 *  - routes JSON array with station name mapping
 */
final class ShiftScheduleMapper
{
    private const BASE_STATION_MAP = [
        'Depo' => 'Депо',
    ];

    /**
     * Build station display map including dynamic crew-change stations.
     */
    private function buildStationMap(GenerationParameters $params): array
    {
        $map = self::BASE_STATION_MAP;
        foreach ($params->crewChangeStations as $station) {
            $map[$station] = $params->crewChangeStationLabel;
        }

        return $map;
    }

    /**
     * @param GeneratedShift[]     $shifts
     * @param ShiftSchedules       $schedule
     * @param GenerationParameters $params
     * @return ShiftScheduleDetails[]
     */
    public function map(array $shifts, ShiftSchedules $schedule, GenerationParameters $params): array
    {
        $details = [];

        foreach ($shifts as $shift) {
            $detail = $this->mapShift($shift, $schedule, $params);
            $details[] = $detail;
        }

        return $details;
    }

    private function mapShift(GeneratedShift $shift, ShiftSchedules $schedule, GenerationParameters $params): ShiftScheduleDetails
    {
        $detail = new ShiftScheduleDetails();
        $detail->setShiftSchedule($schedule);
        $detail->setShiftCode($shift->shiftId);

        $startTime = $shift->startTime();
        $endTime = $shift->endTime();

        // at_doctor: shift start - doctor_offset
        $doctorTime = max(0, $startTime - $params->doctorOffsetMinutes * 60);
        $detail->setAtDoctor($this->secondsToHHMM($doctorTime));

        // at_duty_officer: shift start - duty_offset
        $dutyTime = max(0, $startTime - $params->dutyOfficerOffsetMinutes * 60);
        $detail->setAtDutyOfficer($this->secondsToHHMM($dutyTime));

        // shift_end
        $detail->setShiftEnd($this->secondsToHHMM($endTime));

        // worked_time (total shift duration)
        $detail->setWorkedTime($this->secondsToHHMM($shift->totalDuration()));

        // night_work: overlap of block drive times with night window
        $nightWork = $this->calculateNightWork($shift, $params);
        $detail->setNightWork($nightWork > 0 ? $this->secondsToHHMM($nightWork) : '00:00');

        // kilometers: default 0.0 — not available from timetable
        $detail->setKilometers(0.0);

        // zero_time: idle time = total_duration - total_drive, in minutes
        $idleSeconds = $shift->totalDuration() - $shift->totalDrive();
        $idleMinutes = intdiv($idleSeconds, 60);
        $detail->setZeroTime($idleMinutes);

        // routes JSON
        $routes = $this->buildRoutes($shift, $params);
        $detail->setRoutes($routes);

        return $detail;
    }

    private function calculateNightWork(GeneratedShift $shift, GenerationParameters $params): int
    {
        $nightStart = $params->nightWorkStartSeconds;
        $nightEnd = $params->nightWorkEndSeconds;
        $totalNight = 0;

        foreach ($shift->entries as $entry) {
            $b = $entry->block;
            $blockStart = $b->boardTime;
            $blockEnd = $b->alightTime;

            if ($nightStart > $nightEnd) {
                // Night window crosses midnight: e.g. 22:00–06:00
                // Window 1: nightStart..24:00
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, $nightStart, 86400);
                // Window 2: 00:00..nightEnd
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, 0, $nightEnd);
                // Also check for blocks that cross into next day (time > 86400)
                if ($blockEnd > 86400) {
                    $totalNight += $this->overlapSeconds($blockStart, $blockEnd, 86400, 86400 + $nightEnd);
                }
            } else {
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, $nightStart, $nightEnd);
            }
        }

        return $totalNight;
    }

    private function overlapSeconds(int $aStart, int $aEnd, int $bStart, int $bEnd): int
    {
        $start = max($aStart, $bStart);
        $end = min($aEnd, $bEnd);

        return max(0, $end - $start);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRoutes(GeneratedShift $shift, GenerationParameters $params): array
    {
        $routes = [];
        $stationMap = $this->buildStationMap($params);

        foreach ($shift->entries as $entry) {
            $b = $entry->block;

            // Extract numeric route part (e.g. '101-morning' → 101)
            $routeNumeric = (int) preg_replace('/[^0-9]/', '', explode('-', $b->routeId)[0]);

            $routes[] = [
                'route' => $routeNumeric,
                'route_kilometers' => 0.0,
                'pickup_location' => $this->mapStation($b->boardStation, $stationMap),
                'pickup_route_number' => $b->train,
                'in_schedule' => $this->secondsToHHMM($b->boardTime),
                'from_schedule' => $this->secondsToHHMM($b->alightTime),
                'dropoff_location' => $this->mapStation($b->alightStation, $stationMap),
                'dropoff_route_number' => $b->train,
            ];
        }

        return $routes;
    }

    private function mapStation(string $station, array $stationMap): string
    {
        if (isset($stationMap[$station])) {
            return $stationMap[$station];
        }

        return $station;
    }

    private function secondsToHHMM(int $seconds): string
    {
        $h = intdiv(abs($seconds), 3600) % 24;
        $m = intdiv(abs($seconds) % 3600, 60);

        return sprintf('%02d:%02d', $h, $m);
    }
}
