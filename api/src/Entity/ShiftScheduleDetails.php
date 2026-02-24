<?php

namespace App\Entity;

use App\Repository\ShiftScheduleDetailsRepository;
use App\State\ShiftScheduleDetailsProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ShiftScheduleDetailsRepository::class)]
#[ApiResource(
    description: 'Конкретна смяна в графика',
    mercure: true,
    normalizationContext: ['groups' => ['shift_detail:read']], 
    denormalizationContext: ['groups' => ['shift_detail:write']],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true,
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: ShiftScheduleDetailsProcessor::class),
        new Put(processor: ShiftScheduleDetailsProcessor::class),
        new Patch(processor: ShiftScheduleDetailsProcessor::class),
        new Delete(),
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'shift_schedule' => 'exact',
    'shift_code' => 'partial'
])]
#[ORM\HasLifecycleCallbacks]
class ShiftScheduleDetails
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['shift_detail:read', 'schedule:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ShiftSchedules::class, inversedBy: 'details')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotNull(message: 'Графикът е задължителен')]
    #[ApiProperty(
        description: 'График (Група)',
        readableLink: false,
        writableLink: false
    )]
    private ?ShiftSchedules $shift_schedule = null;

    #[ORM\Column(length: 20)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
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

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[Assert\NotBlank(message: 'При лекар е задължително')]
    #[ApiProperty(
        description: 'При лекар (начало на смяна)',
        example: '08:00'
    )]
    private ?\DateTimeInterface $at_doctor = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[Assert\NotBlank(message: 'При дежурен е задължително')]
    #[ApiProperty(
        description: 'При дежурен',
        example: '08:30'
    )]
    private ?\DateTimeInterface $at_duty_officer = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[Assert\NotBlank(message: 'Край на смяната е задължително')]
    #[ApiProperty(
        description: 'Край на смяната',
        example: '18:30'
    )]
    private ?\DateTimeInterface $shift_end = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[Assert\NotBlank(message: 'Отработеното време е задължително')]
    #[ApiProperty(
        description: 'Отработено време',
        example: '10:00'
    )]
    private ?\DateTimeInterface $worked_time = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[ApiProperty(
        description: 'Нощен труд',
        example: '00:00'
    )]
    private ?\DateTimeInterface $night_work = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[Groups(['shift_detail:read', 'schedule:read'])]
    #[ApiProperty(
        description: 'Общо време с коефициент 1,143',
        readable: true,
        writable: false
    )]
    private ?\DateTimeInterface $total_time = null;

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[Assert\PositiveOrZero(message: 'Километрите не могат да са отрицателни')]
    #[ApiProperty(
        description: 'Километри',
        example: '0.00'
    )]
    private float $kilometers = 0.00;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[ApiProperty(
        description: 'Нулево време (престой) в минути, може да е отрицателно',
        example: '-110'
    )]
    private int|string|null $zero_time = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['shift_detail:read', 'shift_detail:write', 'schedule:read'])]
    #[ApiProperty(
        description: 'Маршрути и места по смяна (JSON масив)',
        example: '[{"route": 1, "pickup_location": "МС-14", "pickup_route_number": 2, "in_schedule": "08:00", "from_schedule": "16:00", "dropoff_location": "Депо", "dropoff_route_number": }]'
    )]
    private ?array $routes = [];

    #[ORM\Column]
    #[Groups(['shift_detail:read'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['shift_detail:read'])]
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

    public function getShiftSchedule(): ?ShiftSchedules
    {
        return $this->shift_schedule;
    }

    public function setShiftSchedule(?ShiftSchedules $shift_schedule): static
    {
        $this->shift_schedule = $shift_schedule;
        return $this;
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

    public function getAtDoctor(): ?string
    {
        return $this->at_doctor?->format('H:i');
    }

    public function setAtDoctor(string|\DateTimeInterface $at_doctor): static
    {
        $normalized = $this->normalizeTimeValue($at_doctor);
        if ($normalized === null) {
            throw new \InvalidArgumentException('При лекар е задължително');
        }

        $this->at_doctor = $normalized;
        return $this;
    }

    public function getAtDutyOfficer(): ?string
    {
        return $this->at_duty_officer?->format('H:i');
    }

    public function setAtDutyOfficer(string|\DateTimeInterface $at_duty_officer): static
    {
        $normalized = $this->normalizeTimeValue($at_duty_officer);
        if ($normalized === null) {
            throw new \InvalidArgumentException('При дежурен е задължително');
        }

        $this->at_duty_officer = $normalized;
        return $this;
    }

    public function getShiftEnd(): ?string
    {
        return $this->shift_end?->format('H:i');
    }

    public function setShiftEnd(string|\DateTimeInterface $shift_end): static
    {
        $normalized = $this->normalizeTimeValue($shift_end);
        if ($normalized === null) {
            throw new \InvalidArgumentException('Край на смяната е задължително');
        }

        $this->shift_end = $normalized;
        return $this;
    }

    public function getWorkedTime(): ?string
    {
        return $this->worked_time?->format('H:i');
    }

    public function setWorkedTime(string|\DateTimeInterface $worked_time): static
    {
        $normalized = $this->normalizeTimeValue($worked_time);
        if ($normalized === null) {
            throw new \InvalidArgumentException('Отработеното време е задължително');
        }

        $this->worked_time = $normalized;
        return $this;
    }

    public function getNightWork(): ?string
    {
        return $this->night_work?->format('H:i');
    }

    public function setNightWork(string|\DateTimeInterface|null $night_work): static
    {
        $this->night_work = $this->normalizeTimeValue($night_work);
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

    /**
     * Get zero_time as signed duration string (e.g., '-1:50', '2:15', null)
     */
    public function getZeroTime(): ?string
    {
        if ($this->zero_time === null) {
            return null;
        }

        $sign = $this->zero_time < 0 ? '-' : '';
        $absMinutes = abs($this->zero_time);
        $hours = intdiv($absMinutes, 60);
        $minutes = $absMinutes % 60;

        return sprintf('%s%d:%02d', $sign, $hours, $minutes);
    }

    /**
     * Set zero_time from signed duration string (e.g., '-1:50', '2:15', null)
     */
    public function setZeroTime(string|int|null $zero_time): static
    {
        if ($zero_time === null) {
            $this->zero_time = null;
            return $this;
        }

        if (is_int($zero_time)) {
            $this->zero_time = $zero_time;
            return $this;
        }

        // Parse string format: '-H:MM', 'H:MM', etc.
        $trimmed = trim($zero_time);
        if ($trimmed === '' || $trimmed === '0:00' || $trimmed === '-0:00') {
            $this->zero_time = 0;
            return $this;
        }

        // Match signed duration format
        if (preg_match('/^(-?)(\d+):(\d{2})$/', $trimmed, $matches)) {
            $sign = $matches[1] === '-' ? -1 : 1;
            $hours = (int)$matches[2];
            $minutes = (int)$matches[3];

            if ($minutes > 59) {
                throw new \InvalidArgumentException(sprintf('Invalid zero_time format: %s (minutes must be 0-59)', $zero_time));
            }

            $this->zero_time = $sign * ($hours * 60 + $minutes);
            return $this;
        }

        throw new \InvalidArgumentException(sprintf('Invalid zero_time format: %s (expected "-H:MM" or "H:MM")', $zero_time));
    }

    public function getRoutes(): ?array
    {
        return $this->routes;
    }

    public function setRoutes(?array $routes): static
    {
        $this->routes = $routes;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        if ($this->created_at === null) {
            $this->created_at = new \DateTimeImmutable();
        }
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
        if ($this->created_at === null) {
            $this->created_at = new \DateTimeImmutable();
        }

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

        $this->total_time = $this->normalizeTimeValue(sprintf('%02d:%02d', $hours, $minutes));
    }

    private function normalizeTimeValue(string|\DateTimeInterface|null $value): ?\DateTime
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            $timeValue = $value->format('H:i');
        } else {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }

            if (preg_match('/^\d{2}:\d{2}$/', $trimmed)) {
                $timeValue = $trimmed;
            } else {
                try {
                    $parsed = new \DateTimeImmutable($trimmed);
                    $timeValue = $parsed->format('H:i');
                } catch (\Exception) {
                    throw new \InvalidArgumentException(sprintf('Невалиден формат за време: %s', $trimmed));
                }
            }
        }

        $normalized = \DateTime::createFromFormat('!H:i', $timeValue, new \DateTimeZone('UTC'));
        if ($normalized === false) {
            throw new \InvalidArgumentException(sprintf('Невалиден формат за време: %s', $timeValue));
        }

        return $normalized;
    }
}
