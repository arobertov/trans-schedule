<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GenerationParameters;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * HTTP клиент към OR-Tools CP-SAT solver микросервиса.
 *
 * Изпраща блокове и параметри, получава оптимално/почти-оптимално
 * разпределение на блокове към смени.
 *
 * Ако солвърът не е достъпен, връща null и алгоритъмът се връща
 * към greedy ShiftAssigner.
 */
final class SolverClient
{
    private string $solverUrl;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
    ) {
        $this->solverUrl = $_ENV['SOLVER_URL'] ?? 'http://solver:8000';
    }

    /**
     * Проверява дали солвърът е достъпен.
     */
    public function isAvailable(): bool
    {
        try {
            $response = $this->httpClient->request('GET', $this->solverUrl . '/health', [
                'timeout' => 3,
            ]);

            return $response->getStatusCode() === 200;
        } catch (\Throwable $e) {
            $this->logger->warning('OR-Tools solver недостъпен: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Изпраща блокове към солвъра и получава разпределение.
     *
     * @param DrivingBlock[]       $blocks           Всички блокове за разпределяне
     * @param GenerationParameters $params            Параметри на генерирането
     * @param int[][]              $phase0BlockIds    Индекси на блокове, вече присвоени в Фаза 0
     * @param int                  $timeoutSeconds    Максимално време за решаване
     *
     * @return array|null Null ако солвърът е недостъпен или има грешка.
     *                    Иначе масив с ключове: status, shifts, unassigned_block_indices,
     *                    objective_value, solve_time_ms, feedback
     */
    public function solve(
        array $blocks,
        GenerationParameters $params,
        array $phase0BlockIds = [],
        int $timeoutSeconds = 30,
    ): ?array {
        $payload = [
            'blocks' => array_map(fn (DrivingBlock $b) => [
                'route_id' => $b->routeId,
                'train' => $b->train,
                'block_index' => $b->blockIndex,
                'board_station' => $b->boardStation,
                'board_time' => $b->boardTime,
                'alight_station' => $b->alightStation,
                'alight_time' => $b->alightTime,
                'route_start_station' => $b->routeStartStation,
                'route_end_station' => $b->routeEndStation,
            ], array_values($blocks)),
            'parameters' => [
                'max_drive_seconds' => $params->maxDriveSeconds(),
                'min_rest_seconds' => $params->minRestSeconds(),
                'cross_train_handoff_seconds' => $params->crossTrainHandoffSeconds(),
                'max_morning_seconds' => $params->maxMorningSeconds(),
                'max_day_seconds' => $params->maxDaySeconds(),
                'max_night_seconds' => $params->maxNightSeconds(),
                'min_morning_seconds' => $params->minMorningSeconds(),
                'min_day_seconds' => $params->minDaySeconds(),
                'min_night_seconds' => $params->minNightSeconds(),
                'morning_threshold_seconds' => $params->morningThresholdSeconds,
                'night_threshold_seconds' => $params->nightThresholdSeconds,
                'morning_end_time_seconds' => $params->morningEndTimeSeconds,
                'day_start_time_seconds' => $params->dayStartTimeSeconds,
                'day_end_time_seconds' => $params->dayEndTimeSeconds,
                'day_target_minutes' => $params->dayTargetMinutes,
                'crew_change_stations' => $params->crewChangeStations,
                'target_morning_shifts' => $params->targetMorningShifts,
                'target_day_shifts' => $params->targetDayShifts,
                'target_night_shifts' => $params->targetNightShifts,
            ],
            'phase0_shift_block_ids' => $phase0BlockIds,
            'timeout_seconds' => $timeoutSeconds,
        ];

        try {
            $response = $this->httpClient->request('POST', $this->solverUrl . '/solve', [
                'json' => $payload,
                'timeout' => $timeoutSeconds + 10, // Extra margin for HTTP overhead
            ]);

            $data = $response->toArray();

            $this->logger->info(sprintf(
                'OR-Tools solver: status=%s, %d shifts, %d unassigned, %dms',
                $data['status'] ?? 'unknown',
                count($data['shifts'] ?? []),
                count($data['unassigned_block_indices'] ?? []),
                $data['solve_time_ms'] ?? 0,
            ));

            return $data;
        } catch (\Throwable $e) {
            $this->logger->error('OR-Tools solver грешка: ' . $e->getMessage());

            return null;
        }
    }
}
