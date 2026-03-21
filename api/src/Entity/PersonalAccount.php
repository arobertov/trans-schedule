<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\PersonalAccountRepository;
use App\State\PersonalAccountProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    description: 'Лични сметки на машинисти по месец',
    mercure: true,
    normalizationContext: ['groups' => ['personal_account:read']],
    denormalizationContext: ['groups' => ['personal_account:write']],
    paginationItemsPerPage: 1000,
    paginationClientEnabled: false,
    paginationClientItemsPerPage: false,
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['personal_account:list']]),
        new Get(),
        new Post(processor: PersonalAccountProcessor::class),
        new Put(processor: PersonalAccountProcessor::class),
        new Patch(processor: PersonalAccountProcessor::class),
        new Delete(),
    ]
)]
#[ApiFilter(
    SearchFilter::class,
    properties: [
        'year' => 'exact',
        'month' => 'exact',
        'position' => 'exact',
        'employee' => 'exact',
        'monthly_schedule' => 'exact',
    ]
)]
#[ApiFilter(
    OrderFilter::class,
    properties: ['id', 'year', 'month', 'employee_name', 'created_at', 'updated_at'],
    arguments: ['orderParameterName' => 'order']
)]
#[ORM\Entity(repositoryClass: PersonalAccountRepository::class)]
#[ORM\Table(name: 'personal_accounts')]
#[ORM\UniqueConstraint(name: 'uniq_personal_account_month', columns: ['employee_id', 'position_id', 'year', 'month'])]
#[ORM\HasLifecycleCallbacks]
class PersonalAccount
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Employees::class, fetch: 'LAZY')]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Служителят е задължителен')]
    #[Groups(['personal_account:read', 'personal_account:write'])]
    #[ApiProperty(readableLink: false, writableLink: false, description: 'Машинист ПЖМ')]
    private ?Employees $employee = null;

    #[ORM\Column(length: 255)]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Име на машиниста за бърз списък')]
    private string $employee_name = '';

    #[ORM\ManyToOne(targetEntity: Positions::class, fetch: 'LAZY')]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Длъжността е задължителна')]
    #[Groups(['personal_account:read', 'personal_account:write'])]
    #[ApiProperty(readableLink: false, writableLink: false, description: 'Длъжност')]
    private ?Positions $position = null;

    #[ORM\ManyToOne(targetEntity: MonthlySchedule::class, fetch: 'LAZY')]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Месечният график е задължителен')]
    #[Groups(['personal_account:read', 'personal_account:write'])]
    #[ApiProperty(readableLink: false, writableLink: false, description: 'Източник месечен график')]
    private ?MonthlySchedule $monthly_schedule = null;

    #[ORM\Column]
    #[Assert\Range(min: 2020, max: 2100, notInRangeMessage: 'Годината трябва да е между 2020 и 2100')]
    #[Groups(['personal_account:list', 'personal_account:read', 'personal_account:write'])]
    private ?int $year = null;

    #[ORM\Column]
    #[Assert\Range(min: 1, max: 12, notInRangeMessage: 'Месецът трябва да е между 1 и 12')]
    #[Groups(['personal_account:list', 'personal_account:read', 'personal_account:write'])]
    private ?int $month = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Индивидуална норма в минути')]
    private int $individual_norm_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Отработено време в минути')]
    private int $worked_time_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Нощен труд в минути')]
    private int $night_work_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Корекция 1,143 в минути')]
    private int $night_correction_1143_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Отработено време + корекция 1,143 в минути')]
    private int $worked_with_correction_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Нулево време в минути')]
    private int $zero_time_minutes = 0;

    #[ORM\Column(type: Types::FLOAT, options: ['default' => '0'])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Километри общо, включително Протокол - ДПК')]
    private float $kilometers_total = 0.0;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => '0.00'])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Нощен труд в десетични часове DD,DD')]
    private string $night_work_x24 = '0.00';

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: '+/- за минал месец в минути')]
    private int $previous_month_balance_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: '+/- за текущ месец в минути')]
    private int $current_month_balance_minutes = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    #[ApiProperty(description: 'Общо за периода в минути')]
    private int $period_total_minutes = 0;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['personal_account:read', 'personal_account:write'])]
    #[ApiProperty(description: 'Подробни редове по дати: дата, смяна, отработено време, нощен труд, километри, протокол ДПК')]
    private ?array $detail_rows = [];

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['personal_account:list', 'personal_account:read'])]
    private ?\DateTimeImmutable $updated_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
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

    public function getEmployee(): ?Employees
    {
        return $this->employee;
    }

    public function setEmployee(?Employees $employee): static
    {
        $this->employee = $employee;

        return $this;
    }

    public function getEmployeeName(): string
    {
        return $this->employee_name;
    }

    public function setEmployeeName(string $employee_name): static
    {
        $this->employee_name = $employee_name;

        return $this;
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

    public function getMonthlySchedule(): ?MonthlySchedule
    {
        return $this->monthly_schedule;
    }

    public function setMonthlySchedule(?MonthlySchedule $monthly_schedule): static
    {
        $this->monthly_schedule = $monthly_schedule;

        return $this;
    }

    public function getYear(): ?int
    {
        return $this->year;
    }

    public function setYear(?int $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(?int $month): static
    {
        $this->month = $month;

        return $this;
    }

    public function getIndividualNormMinutes(): int
    {
        return $this->individual_norm_minutes;
    }

    public function setIndividualNormMinutes(int $individual_norm_minutes): static
    {
        $this->individual_norm_minutes = $individual_norm_minutes;

        return $this;
    }

    public function getWorkedTimeMinutes(): int
    {
        return $this->worked_time_minutes;
    }

    public function setWorkedTimeMinutes(int $worked_time_minutes): static
    {
        $this->worked_time_minutes = $worked_time_minutes;

        return $this;
    }

    public function getNightWorkMinutes(): int
    {
        return $this->night_work_minutes;
    }

    public function setNightWorkMinutes(int $night_work_minutes): static
    {
        $this->night_work_minutes = $night_work_minutes;

        return $this;
    }

    public function getNightCorrection1143Minutes(): int
    {
        return $this->night_correction_1143_minutes;
    }

    public function setNightCorrection1143Minutes(int $night_correction_1143_minutes): static
    {
        $this->night_correction_1143_minutes = $night_correction_1143_minutes;

        return $this;
    }

    public function getWorkedWithCorrectionMinutes(): int
    {
        return $this->worked_with_correction_minutes;
    }

    public function setWorkedWithCorrectionMinutes(int $worked_with_correction_minutes): static
    {
        $this->worked_with_correction_minutes = $worked_with_correction_minutes;

        return $this;
    }

    public function getZeroTimeMinutes(): int
    {
        return $this->zero_time_minutes;
    }

    public function setZeroTimeMinutes(int $zero_time_minutes): static
    {
        $this->zero_time_minutes = $zero_time_minutes;

        return $this;
    }

    public function getKilometersTotal(): float
    {
        return $this->kilometers_total;
    }

    public function setKilometersTotal(float $kilometers_total): static
    {
        $this->kilometers_total = round($kilometers_total, 2);

        return $this;
    }

    public function getNightWorkX24(): string
    {
        return $this->night_work_x24;
    }

    public function setNightWorkX24(string $night_work_x24): static
    {
        $this->night_work_x24 = $night_work_x24;

        return $this;
    }

    public function getPreviousMonthBalanceMinutes(): int
    {
        return $this->previous_month_balance_minutes;
    }

    public function setPreviousMonthBalanceMinutes(int $previous_month_balance_minutes): static
    {
        $this->previous_month_balance_minutes = $previous_month_balance_minutes;

        return $this;
    }

    public function getCurrentMonthBalanceMinutes(): int
    {
        return $this->current_month_balance_minutes;
    }

    public function setCurrentMonthBalanceMinutes(int $current_month_balance_minutes): static
    {
        $this->current_month_balance_minutes = $current_month_balance_minutes;

        return $this;
    }

    public function getPeriodTotalMinutes(): int
    {
        return $this->period_total_minutes;
    }

    public function setPeriodTotalMinutes(int $period_total_minutes): static
    {
        $this->period_total_minutes = $period_total_minutes;

        return $this;
    }

    public function getDetailRows(): ?array
    {
        return $this->detail_rows;
    }

    public function setDetailRows(?array $detail_rows): static
    {
        $this->detail_rows = $detail_rows;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(?\DateTimeImmutable $created_at): static
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
