<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * A single station stop along a route.
 * Time is stored as seconds from midnight (may exceed 86400 for next-day).
 */
final class Stop
{
    public function __construct(
        public readonly string $station,
        public readonly int $time,
    ) {
    }

    public function timeStr(): string
    {
        $h = intdiv($this->time, 3600) % 24;
        $m = intdiv($this->time % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }

    public function isStation14(): bool
    {
        return $this->station === '14_1' || $this->station === '14_2';
    }

    public function isDepo(): bool
    {
        return $this->station === 'Depo';
    }
}
