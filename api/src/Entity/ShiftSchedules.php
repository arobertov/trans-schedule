<?php

namespace App\Entity;

use App\Repository\ShiftSchedulesRepository;
use App\State\ShiftSchedulesProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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

#[ORM\Entity(repositoryClass: ShiftSchedulesRepository::class)]
#[ApiResource(
    description: 'График на смените',
    mercure: true,
    normalizationContext: ['groups' => ['shift:read']], 
    denormalizationContext: ['groups' => ['shift:write']],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true,
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: ShiftSchedulesProcessor::class),
        new Put(processor: ShiftSchedulesProcessor::class),
        new Patch(processor: ShiftSchedulesProcessor::class),
        new Delete(),
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'shift_code' => 'partial'
])]
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

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotBlank(message: 'При лекар е задължително')]
    #[ApiProperty(
        description: 'При лекар (начало на смяна)',
        example: '08:00'
    )]
    private ?\DateTimeInterface $at_doctor = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotBlank(message: 'При дежурен е задължително')]
    #[ApiProperty(
        description: 'При дежурен',
        example: '12:00'
    )]
    private ?\DateTimeInterface $at_duty_officer = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift:read', 'shift:write'])]
    #[Assert\NotBlank(message: 'Край на смяната е задължително')]
    #[ApiProperty(
        description: 'Край на смяната',
        example: '16:00'
    )]
    private ?\DateTimeInterface $shift_end = null;

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

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups(['shift:read', 'shift:write'])]
    #[ApiProperty(
        description: 'Нулево време (престой) в минути, може да е отрицателно',
        example: '-110'
    )]
    private ?int $zero_time = null;

    #[ORM\OneToMany(targetEntity: ShiftScheduleDetails::class, mappedBy: 'shift_schedule', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['shift:read', 'shift:write'])]
    #[ApiProperty(
        description: 'График на маршрути и места'
    )]
    private Collection $details;

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

    public function __construct()
    {
        $this->details = new ArrayCollection();
    }

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

    public function getAtDoctor(): ?string
    {
        return $this->at_doctor?->format('H:i');
    }

    public function setAtDoctor(string|\DateTimeInterface $at_doctor): static
    {
        if (is_string($at_doctor)) {
            $this->at_doctor = \DateTime::createFromFormat('H:i', $at_doctor);
        } else {
            $this->at_doctor = $at_doctor;
        }
        return $this;
    }

    public function getAtDutyOfficer(): ?string
    {
        return $this->at_duty_officer?->format('H:i');
    }

    public function setAtDutyOfficer(string|\DateTimeInterface $at_duty_officer): static
    {
        if (is_string($at_duty_officer)) {
            $this->at_duty_officer = \DateTime::createFromFormat('H:i', $at_duty_officer);
        } else {
            $this->at_duty_officer = $at_duty_officer;
        }
        return $this;
    }

    public function getShiftEnd(): ?string
    {
        return $this->shift_end?->format('H:i');
    }

    public function setShiftEnd(string|\DateTimeInterface $shift_end): static
    {
        if (is_string($shift_end)) {
            $this->shift_end = \DateTime::createFromFormat('H:i', $shift_end);
        } else {
            $this->shift_end = $shift_end;
        }
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

    /**
     * @return Collection<int, ShiftScheduleDetails>
     */
    public function getDetails(): Collection
    {
        return $this->details;
    }

    public function addDetail(ShiftScheduleDetails $detail): static
    {
        if (!$this->details->contains($detail)) {
            $this->details->add($detail);
            $detail->setShiftSchedule($this);
        }
        return $this;
    }

    public function removeDetail(ShiftScheduleDetails $detail): static
    {
        if ($this->details->removeElement($detail)) {
            if ($detail->getShiftSchedule() === $this) {
                $detail->setShiftSchedule(null);
            }
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
