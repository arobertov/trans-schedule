<?php

declare(strict_types=1);

namespace App\Dto\ShiftGenerator;

/**
 * Validation result from the shift validator.
 */
final class ValidationResult
{
    /** @var string[] */
    public array $warnings = [];

    /** @var string[] */
    public array $errors = [];

    public function isOk(): bool
    {
        return \count($this->errors) === 0;
    }

    public function warn(string $msg): void
    {
        $this->warnings[] = $msg;
    }

    public function error(string $msg): void
    {
        $this->errors[] = $msg;
    }

    public function toArray(): array
    {
        return [
            'ok' => $this->isOk(),
            'warnings' => $this->warnings,
            'errors' => $this->errors,
        ];
    }
}
