<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * One entry in a shift — a driving block plus the rest period after it (if any).
 */
final class ShiftEntry
{
    public function __construct(
        public readonly DrivingBlock $block,
        public ?int $restAfter = null,
    ) {
    }
}
