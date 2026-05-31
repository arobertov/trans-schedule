<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class ShiftScheduleWorkbook
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'workbook', targetEntity: ShiftSchedules::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ShiftSchedules $schedule = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $snapshot = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSchedule(): ?ShiftSchedules
    {
        return $this->schedule;
    }

    public function setSchedule(?ShiftSchedules $schedule): static
    {
        $this->schedule = $schedule;
        return $this;
    }

    public function getSnapshot(): ?array
    {
        return $this->snapshot;
    }

    public function setSnapshot(?array $snapshot): static
    {
        $this->snapshot = $snapshot;
        return $this;
    }
}
