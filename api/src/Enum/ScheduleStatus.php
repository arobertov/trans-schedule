<?php

namespace App\Enum;

enum ScheduleStatus: string
{
    case Draft = 'чернова';
    case Published = 'утвърден';
    case Archived = 'архивиран';

    public function label(): string
    {
        return match($this) {
            self::Draft => 'Чернова',
            self::Published => 'Утвърден',
            self::Archived => 'Архивиран',
        };
    }
}
