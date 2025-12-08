<?php

namespace App\Entity;

use App\Enum\DayType;
use App\Enum\Season;
use App\Repository\ShiftSchedulesRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ShiftSchedulesRepository::class)]
#[ApiResource(
    description: 'График на смените',
    mercure: true,
    normalizationContext: ['groups' => ['shift:read']], 
    denormalizationContext: ['groups' => ['shift:write']],
    paginationItemsPerPage: 30
)]
#[ORM\HasLifecycleCallbacks]
class ShiftSchedules
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['shift:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\Column(length: 20)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotBlank(message: 'Кодът на смяната е задължителен')]
    #[Assert\Length(
        min: 1,
        max: 20,
        minMessage: 'Кодът трябва да е поне {{ limit }} символа',
        maxMessage: 'Кодът не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Код на смяна',
        example: 'СМ1-С'
    )]
    private ?string $shift_code = null;

    #[ORM\Column(enumType: DayType::class)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotNull(message: 'Типът ден е задължителен')]
    #[ApiProperty(
        description: 'Тип ден',
        openapiContext: [
            'type' => 'string',
            'enum' => ['Делник', 'Празник']
        ]
    )]
    private ?DayType $day_type = null;

    #[ORM\Column(enumType: Season::class)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotNull(message: 'Сезонът е задължителен')]
    #[ApiProperty(
        description: 'Сезон',
        openapiContext: [
            'type' => 'string',
            'enum' => ['Зимен', 'Летен']
        ]
    )]
    private ?Season $season = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotBlank(message: 'Отработеното време е задължително')]
    #[ApiProperty(
        description: 'Отработено време',
        example: '08:00'
    )]
    private ?\DateTimeInterface $worked_time = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[Groups(['shift:read', 'shift:write'])]
    #[ApiProperty(
        description: 'Нощен труд',
        example: '00:00'
    )]
    private ?\DateTimeInterface $night_work = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[Groups(['shift:read'])]
    #[ApiProperty(
        description: 'Общо време с коефициент 1,143',
        readable: true,
        writable: false
    )]
    private ?\DateTimeInterface $total_time = null;

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\PositiveOrZero(message: 'Километрите не могат да са отрицателни')]
    #[ApiProperty(
        description: 'Километри',
        example: '0.00'
    )]
    private float $kilometers = 0.00;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[Groups(['shift:read', 'shift:write'])]
    #[ApiProperty(
        description: 'Нулево време (престой)',
        example: '00:00'
    )]
    private ?\DateTimeInterface $zero_time = null;

    #[ORM\Column]
    #[Groups(['shift:read'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['shift:read'])]
    #[ApiProperty(
        description: 'Дата на последна промяна',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $updated_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getShiftCode(): ?string
    {
        return $this->shift_code;
    }

    public function setShiftCode(string $shift_code): static
    {
        $this->shift_code = $shift_code;
        return $this;
    }

    public function getDayType(): ?DayType
    {
        return $this->day_type;
    }

    public function setDayType(DayType $day_type): static
    {
        $this->day_type = $day_type;
        return $this;
    }

    public function getSeason(): ?Season
    {
        return $this->season;
    }

    public function setSeason(Season $season): static
    {
        $this->season = $season;
        return $this;
    }

    public function getWorkedTime(): ?string
    {
        return $this->worked_time?->format('H:i');
    }

    public function setWorkedTime(string|\DateTimeInterface $worked_time): static
    {
        if (is_string($worked_time)) {
            $this->worked_time = \DateTime::createFromFormat('H:i', $worked_time);
        } else {
            $this->worked_time = $worked_time;
        }
        return $this;
    }

    public function getNightWork(): ?string
    {
        return $this->night_work?->format('H:i');
    }

    public function setNightWork(string|\DateTimeInterface|null $night_work): static
    {
        if (is_string($night_work)) {
            $this->night_work = \DateTime::createFromFormat('H:i', $night_work);
        } else {
            $this->night_work = $night_work;
        }
        return $this;
    }

    public function getTotalTime(): ?string
    {
        return $this->total_time?->format('H:i');
    }

    public function getKilometers(): float
    {
        return $this->kilometers;
    }

    public function setKilometers(float $kilometers): static
    {
        $this->kilometers = round($kilometers, 2);
        return $this;
    }

    public function getZeroTime(): ?string
    {
        return $this->zero_time?->format('H:i');
    }

    public function setZeroTime(string|\DateTimeInterface|null $zero_time): static
    {
        if (is_string($zero_time)) {
            $this->zero_time = \DateTime::createFromFormat('H:i', $zero_time);
        } else {
            $this->zero_time = $zero_time;
        }
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->created_at = new \DateTimeImmutable();
        $this->calculateTotalTime();
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updated_at;
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updated_at = new \DateTimeImmutable();
        $this->calculateTotalTime();
    }

    private function calculateTotalTime(): void
    {
        if ($this->worked_time === null) {
            $this->total_time = null;
            return;
        }

        // Превръщаме времето в минути
        $workedMinutes = ($this->worked_time->format('H') * 60) + (int)$this->worked_time->format('i');
        $nightMinutes = $this->night_work ? (($this->night_work->format('H') * 60) + (int)$this->night_work->format('i')) : 0;

        // Прилагаме коефициент 0.143 към нощния труд
        $totalMinutes = $workedMinutes + (int)round($nightMinutes * 0.143);

        // Превръщаме обратно в часове:минути
        $hours = intdiv($totalMinutes, 60);
        $minutes = $totalMinutes % 60;

        $this->total_time = \DateTime::createFromFormat('H:i', sprintf('%02d:%02d', $hours, $minutes));
    }
}
