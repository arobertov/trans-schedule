<?php

declare(strict_types=1);

namespace App\Enum;

enum ShiftScheduleStatus: string
{
    case Draft = 'проект';
    case Active = 'активен';
}
