<?php

namespace App\Enum;

// Използвай 'string' или 'int' като бекенд тип, 'string' е по-добре за четливост.
enum Status: string
{
    case IsActive = 'активен';
    case NotActive = 'неактивен';
    case IsLeave = 'напуснал';
}