<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * A contiguous segment of a train route.
 * Routes 101/102 are split into morning/evening segments by consecutive Depo entries.
 */
final class RouteSegment
{
    /**
     * @param string $routeId e.g. '100', '101-morning', '101-evening'
     * @param int    $train   Train number from timetable
     * @param Stop[] $stops   Ordered list of stops
     */
    public function __construct(
        public readonly string $routeId,
        public readonly int $train,
        public array $stops = [],
    ) {
    }

    public function startTime(): int
    {
        return $this->stops[0]->time ?? 0;
    }

    public function endTime(): int
    {
        return end($this->stops)->time ?? 0;
    }

    public function duration(): int
    {
        return $this->endTime() - $this->startTime();
    }

    /**
     * First station of the route (depot endpoint).
     */
    public function startStation(): string
    {
        return $this->stops[0]->station ?? '';
    }

    /**
     * Last station of the route (depot endpoint).
     */
    public function endStation(): string
    {
        return end($this->stops)->station ?? '';
    }

    /**
     * Whether a station is a route endpoint (first or last station = depot).
     */
    public function isRouteEndpoint(string $station): bool
    {
        return $station === $this->startStation() || $station === $this->endStation();
    }

    /**
     * @return Stop[]
     */
    public function station14Stops(): array
    {
        return array_values(array_filter($this->stops, fn(Stop $s) => $s->isStation14()));
    }
}
