<?php
// src/Dto/TrainScheduleImportLine.php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class TrainScheduleImportLine
{
    #[Assert\NotBlank]
    public string $trainNumber;

    #[Assert\NotBlank]
    public string $stationTrack;

    public ?string $arrivalTime = null;

    public ?string $departureTime = null;
}
