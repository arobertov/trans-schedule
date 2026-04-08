<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * A driving block within a route segment.
 * All times are seconds from midnight.
 */
final class DrivingBlock
{
    public function __construct(
        public readonly string $routeId,
        public readonly int $train,
        public readonly int $blockIndex,
        public readonly string $boardStation,
        public readonly int $boardTime,
        public readonly string $alightStation,
        public readonly int $alightTime,
        public readonly string $routeStartStation = '',
        public readonly string $routeEndStation = '',
    ) {
    }

    public function driveDuration(): int
    {
        return $this->alightTime - $this->boardTime;
    }

    public function boardTimeStr(): string
    {
        return self::formatTime($this->boardTime);
    }

    public function alightTimeStr(): string
    {
        return self::formatTime($this->alightTime);
    }

    public function driveStr(): string
    {
        return self::formatTime($this->driveDuration());
    }

    public function canCrewChangeAtBoard(array $crewChangeStations): bool
    {
        return \in_array($this->boardStation, $crewChangeStations, true);
    }

    public function canCrewChangeAtAlight(array $crewChangeStations): bool
    {
        return \in_array($this->alightStation, $crewChangeStations, true);
    }

    /**
     * Whether the board station is a route endpoint (depot).
     */
    public function isBoardAtRouteEndpoint(): bool
    {
        return $this->boardStation === $this->routeStartStation
            || $this->boardStation === $this->routeEndStation;
    }

    /**
     * Whether the alight station is a route endpoint (depot).
     */
    public function isAlightAtRouteEndpoint(): bool
    {
        return $this->alightStation === $this->routeStartStation
            || $this->alightStation === $this->routeEndStation;
    }

    /**
     * Check if a handoff between two blocks is valid.
     * Valid when the previous alight and next board are both at route endpoints (depot).
     */
    public static function compatibleForHandoff(DrivingBlock $prev, DrivingBlock $next): bool
    {
        return $prev->isAlightAtRouteEndpoint() && $next->isBoardAtRouteEndpoint();
    }

    private static function formatTime(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv(abs($seconds) % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }
}
