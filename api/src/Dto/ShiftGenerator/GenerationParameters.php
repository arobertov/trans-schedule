<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * Encapsulates all dynamic parameters for shift generation.
 * Every parameter has a sensible default matching the original Python algorithm.
 */
final class GenerationParameters
{
    // Block generator
    public readonly int $maxDriveMinutes;

    // Shift assigner
    public readonly int $minRestMinutes;
    public readonly int $maxMorningMinutes;
    public readonly int $maxDayMinutes;
    public readonly int $maxNightMinutes;
    public readonly int $minMorningMinutes;
    public readonly int $minDayMinutes;
    public readonly int $minNightMinutes;
    public readonly int $morningThresholdSeconds;   // seconds from midnight
    public readonly int $morningStation14ThresholdSeconds;
    public readonly int $nightThresholdSeconds;
    public readonly int $dayTargetMinutes;

    // Cross-train handoff
    public readonly int $crossTrainHandoffMinutes;

    // Mapper / output
    public readonly int $doctorOffsetMinutes;
    public readonly int $dutyOfficerOffsetMinutes;
    public readonly int $nightWorkStartSeconds;     // seconds from midnight
    public readonly int $nightWorkEndSeconds;

    // Crew change (turnaround) stations
    /** @var string[] Station identifiers where crew changes can happen */
    public readonly array $crewChangeStations;
    public readonly string $crewChangeStationLabel;

    // Target shift counts (0 = automatic)
    public readonly int $targetMorningShifts;
    public readonly int $targetDayShifts;
    public readonly int $targetNightShifts;

    public function __construct(array $data = [])
    {
        $this->maxDriveMinutes = (int) ($data['max_drive_minutes'] ?? 150);
        $this->minRestMinutes = (int) ($data['min_rest_minutes'] ?? 50);
        $this->maxMorningMinutes = (int) ($data['max_morning_minutes'] ?? 300);
        $this->maxDayMinutes = (int) ($data['max_day_minutes'] ?? 660);
        $this->maxNightMinutes = (int) ($data['max_night_minutes'] ?? 660);
        $this->minMorningMinutes = (int) ($data['min_morning_minutes'] ?? 180);
        $this->minDayMinutes = (int) ($data['min_day_minutes'] ?? 480);
        $this->minNightMinutes = (int) ($data['min_night_minutes'] ?? 480);
        $this->morningThresholdSeconds = self::parseHHMMToSeconds($data['morning_threshold'] ?? '09:30');
        $this->morningStation14ThresholdSeconds = self::parseHHMMToSeconds($data['morning_station14_threshold'] ?? '07:30');
        $this->nightThresholdSeconds = self::parseHHMMToSeconds($data['night_threshold'] ?? '16:30');
        $this->dayTargetMinutes = (int) ($data['day_target_minutes'] ?? 540);
        $this->crossTrainHandoffMinutes = (int) ($data['cross_train_handoff_minutes'] ?? 20);
        $this->doctorOffsetMinutes = (int) ($data['doctor_offset_minutes'] ?? 30);
        $this->dutyOfficerOffsetMinutes = (int) ($data['duty_officer_offset_minutes'] ?? 15);
        $this->nightWorkStartSeconds = self::parseHHMMToSeconds($data['night_work_start'] ?? '22:00');
        $this->nightWorkEndSeconds = self::parseHHMMToSeconds($data['night_work_end'] ?? '06:00');

        // Crew change stations
        $rawStations = $data['crew_change_stations'] ?? ['14_1', '14_2'];
        if (\is_string($rawStations)) {
            $rawStations = array_map('trim', explode(',', $rawStations));
            $rawStations = array_filter($rawStations, fn(string $s) => $s !== '');
        }
        $this->crewChangeStations = array_values((array) $rawStations);
        $this->crewChangeStationLabel = (string) ($data['crew_change_station_label'] ?? 'МС-14');

        // Target shift counts
        $this->targetMorningShifts = (int) ($data['target_morning_shifts'] ?? 0);
        $this->targetDayShifts = (int) ($data['target_day_shifts'] ?? 0);
        $this->targetNightShifts = (int) ($data['target_night_shifts'] ?? 0);
    }

    /**
     * Check whether a station identifier is a crew-change (turnaround) station.
     */
    public function isCrewChangeStation(string $station): bool
    {
        return \in_array($station, $this->crewChangeStations, true);
    }

    public function maxDriveSeconds(): int
    {
        return $this->maxDriveMinutes * 60;
    }

    public function minRestSeconds(): int
    {
        return $this->minRestMinutes * 60;
    }

    public function maxMorningSeconds(): int
    {
        return $this->maxMorningMinutes * 60;
    }

    public function maxDaySeconds(): int
    {
        return $this->maxDayMinutes * 60;
    }

    public function maxNightSeconds(): int
    {
        return $this->maxNightMinutes * 60;
    }

    public function minMorningSeconds(): int
    {
        return $this->minMorningMinutes * 60;
    }

    public function minDaySeconds(): int
    {
        return $this->minDayMinutes * 60;
    }

    public function minNightSeconds(): int
    {
        return $this->minNightMinutes * 60;
    }

    public function dayTargetSeconds(): int
    {
        return $this->dayTargetMinutes * 60;
    }

    public function crossTrainHandoffSeconds(): int
    {
        return $this->crossTrainHandoffMinutes * 60;
    }

    /**
     * Extract the base station name by stripping the track suffix (_1, _2, etc.).
     * e.g. '18_1' → '18', '14_2' → '14', 'Depo' → 'Depo'
     */
    public static function stationBase(string $station): string
    {
        // Do NOT strip suffix for Depo
        if ($station === 'Depo') {
            return $station;
        }

        $pos = strrpos($station, '_');
        if ($pos !== false && ctype_digit(substr($station, $pos + 1))) {
            return substr($station, 0, $pos);
        }

        return $station;
    }

    /**
     * Serialize all parameter values for the API response.
     */
    public function toArray(): array
    {
        return [
            'max_drive_minutes' => $this->maxDriveMinutes,
            'min_rest_minutes' => $this->minRestMinutes,
            'max_morning_minutes' => $this->maxMorningMinutes,
            'max_day_minutes' => $this->maxDayMinutes,
            'max_night_minutes' => $this->maxNightMinutes,
            'min_morning_minutes' => $this->minMorningMinutes,
            'min_day_minutes' => $this->minDayMinutes,
            'min_night_minutes' => $this->minNightMinutes,
            'morning_threshold' => self::secondsToHHMM($this->morningThresholdSeconds),
            'morning_station14_threshold' => self::secondsToHHMM($this->morningStation14ThresholdSeconds),
            'night_threshold' => self::secondsToHHMM($this->nightThresholdSeconds),
            'day_target_minutes' => $this->dayTargetMinutes,
            'cross_train_handoff_minutes' => $this->crossTrainHandoffMinutes,
            'doctor_offset_minutes' => $this->doctorOffsetMinutes,
            'duty_officer_offset_minutes' => $this->dutyOfficerOffsetMinutes,
            'night_work_start' => self::secondsToHHMM($this->nightWorkStartSeconds),
            'night_work_end' => self::secondsToHHMM($this->nightWorkEndSeconds),
            'crew_change_stations' => $this->crewChangeStations,
            'crew_change_station_label' => $this->crewChangeStationLabel,
            'target_morning_shifts' => $this->targetMorningShifts,
            'target_day_shifts' => $this->targetDayShifts,
            'target_night_shifts' => $this->targetNightShifts,
        ];
    }

    private static function parseHHMMToSeconds(string $hhmm): int
    {
        $parts = explode(':', $hhmm);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return $h * 3600 + $m * 60;
    }

    private static function secondsToHHMM(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);

        return sprintf('%02d:%02d', $h, $m);
    }
}
