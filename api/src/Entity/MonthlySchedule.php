<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use App\Controller\RecalculatePersonalAccountsController;
use App\Repository\MonthlyScheduleRepository;
use App\State\MonthlyScheduleStateProcessor;
use App\Enum\ScheduleStatus;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Serializer\Annotation\Groups;

#[ApiResource(
    description: 'Месечен график по длъжности',
    mercure: true,
    normalizationContext: ['groups' => ['schedule:read']],
    denormalizationContext: ['groups' => ['schedule:write']],
    paginationItemsPerPage: 20,
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['schedule:list']]),
        new Post(processor: MonthlyScheduleStateProcessor::class),
        new Get(),
        new Put(processor: MonthlyScheduleStateProcessor::class),
        new Post(
            uriTemplate: '/monthly_schedules/{id}/personal_accounts/recalculate',
            routePrefix: '',
            controller: RecalculatePersonalAccountsController::class,
            deserialize: false,
            validate: false,
            output: false,
            name: 'monthly_schedule_recalculate_personal_accounts'
        ),
        new Delete(),
    ]
)]
#[ApiFilter(
    SearchFilter::class,
    properties: [
        'year' => 'exact',
        'month' => 'exact',
        'position' => 'exact',
        'status' => 'exact',
    ]
)]
#[ApiFilter(
    OrderFilter::class,
    properties: ['id', 'year', 'month', 'created_at', 'updated_at'],
    arguments: ['orderParameterName' => 'order']
)]
#[ORM\Entity(repositoryClass: MonthlyScheduleRepository::class)]
#[ORM\Table(name: 'monthly_schedules')]
#[ORM\HasLifecycleCallbacks]
class MonthlySchedule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['schedule:list', 'schedule:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Positions::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Длъжността е задължителна')]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?Positions $position = null;

    #[ORM\ManyToOne(targetEntity: ShiftSchedules::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['schedule:read', 'schedule:write'])]
    #[ApiProperty(readableLink: false, writableLink: false, description: 'График на смените за делнични дни')]
    private ?ShiftSchedules $weekday_shift_schedule = null;

    #[ORM\ManyToOne(targetEntity: ShiftSchedules::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['schedule:read', 'schedule:write'])]
    #[ApiProperty(readableLink: false, writableLink: false, description: 'График на смените за празнични дни')]
    private ?ShiftSchedules $holiday_shift_schedule = null;

    #[ORM\Column]
    #[Assert\Range(min: 2020, max: 2100, notInRangeMessage: 'Годината трябва да е между 2020 и 2100')]
    #[Assert\NotNull(message: 'Годината е задължителна')]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?int $year = null;

    #[ORM\Column]
    #[Assert\Range(min: 1, max: 12, notInRangeMessage: 'Месецът трябва да е между 1 и 12')]
    #[Assert\NotNull(message: 'Месецът е задължителен')]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?int $month = null;

    #[ORM\Column(nullable: true)]
    #[Assert\PositiveOrZero(message: 'Работните дни трябва да са положително число')]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?int $working_days = null;

    #[ORM\Column(nullable: true)]
    #[Assert\PositiveOrZero(message: 'Работните часове трябва да са положително число')]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?int $working_hours = null;
    
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['schedule:read', 'schedule:write'])]
    private ?string $description = null;

    #[ORM\Column(type: 'string', enumType: ScheduleStatus::class, options: ['default' => 'чернова'])]
    #[Groups(['schedule:list', 'schedule:read', 'schedule:write'])]
    private ?ScheduleStatus $status = ScheduleStatus::Draft;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['schedule:read', 'schedule:write'])]
    #[ApiProperty(description: 'Дали да се използва остатъкът от предходния месец')]
    private bool $link_previous_month_balance = false;

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['schedule:read', 'schedule:write'])]
    #[ApiProperty(description: 'Данни за графика на служителите')]
    private ?array $schedule_rows = null;

    #[ORM\Column(type: 'datetime_immutable')]
    #[Groups(['schedule:list', 'schedule:read'])]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups(['schedule:list', 'schedule:read'])]
    private ?\DateTimeImmutable $updated_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
        $this->status = ScheduleStatus::Draft;
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updated_at = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPosition(): ?Positions
    {
        return $this->position;
    }

    public function setPosition(?Positions $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function getYear(): ?int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getWeekdayShiftSchedule(): ?ShiftSchedules
    {
        return $this->weekday_shift_schedule;
    }

    public function setWeekdayShiftSchedule(?ShiftSchedules $weekday_shift_schedule): static
    {
        $this->weekday_shift_schedule = $weekday_shift_schedule;

        return $this;
    }

    public function getHolidayShiftSchedule(): ?ShiftSchedules
    {
        return $this->holiday_shift_schedule;
    }

    public function setHolidayShiftSchedule(?ShiftSchedules $holiday_shift_schedule): static
    {
        $this->holiday_shift_schedule = $holiday_shift_schedule;

        return $this;
    }

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(int $month): static
    {
        $this->month = $month;

        return $this;
    }

    public function getWorkingDays(): ?int
    {
        return $this->working_days;
    }

    public function setWorkingDays(?int $working_days): static
    {
        $this->working_days = $working_days;

        return $this;
    }

    public function getWorkingHours(): ?int
    {
        return $this->working_hours;
    }

    public function setWorkingHours(?int $working_hours): static
    {
        $this->working_hours = $working_hours;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getStatus(): ?ScheduleStatus
    {
        return $this->status;
    }

    public function setStatus(ScheduleStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function isLinkPreviousMonthBalance(): bool
    {
        return $this->link_previous_month_balance;
    }

    public function getLinkPreviousMonthBalance(): bool
    {
        return $this->link_previous_month_balance;
    }

    public function setLinkPreviousMonthBalance(bool $link_previous_month_balance): static
    {
        $this->link_previous_month_balance = $link_previous_month_balance;

        return $this;
    }

    public function getScheduleRows(): ?array
    {
        return $this->schedule_rows;
    }

    public function setScheduleRows(?array $schedule_rows): static
    {
        $this->schedule_rows = $schedule_rows;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $created_at): static
    {
        $this->created_at = $created_at;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updated_at;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updated_at): static
    {
        $this->updated_at = $updated_at;

        return $this;
    }
}
