<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use App\State\CalendarStateProcessor;
use App\Repository\CalendarRepository;

#[ApiResource(
    description: 'Календар с работни дни и празници',
    mercure: true,
    normalizationContext: ['groups' => ['calendar:read']],
    denormalizationContext: ['groups' => ['calendar:write']],
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: CalendarStateProcessor::class),
        new Put(processor: CalendarStateProcessor::class),
        new Delete()
    ]
)]
#[ApiFilter(SearchFilter::class, properties: ['year' => 'exact'])]
#[ApiFilter(OrderFilter::class, properties: ['year' => 'DESC'])]
#[ORM\Entity(repositoryClass: CalendarRepository::class)]
#[ORM\Table(name: 'calendars')]
#[ORM\UniqueConstraint(name: 'unique_year', columns: ['year'])]
class Calendar
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['calendar:read'])]
    private ?int $id = null;

    #[ORM\Column]
    #[Assert\NotNull]
    #[Groups(['calendar:read', 'calendar:write'])]
    private ?int $year = null;

    #[Groups(['calendar:write'])]
    #[ApiProperty(description: 'URL адрес за извличане на данни (Kik Info или API)')]
    public ?string $sourceUrl = null;

    #[Groups(['calendar:write'])]
    #[ApiProperty(description: 'Източник на данни: "scrape", "api" или "fallback"')]
    public ?string $provider = 'scrape';

    #[Groups(['calendar:write'])]
    #[ApiProperty(description: 'Използване на резервна логика при липса на връзка')]
    public bool $useBackup = false;

    /**
     * @var array<int, array> Data for all 12 months. Key = month number.
     * Structure: {
     *    "1": { "days": [...], "workDays": 20, "workHours": 160 },
     *    ...
     * }
     */
    #[ORM\Column(type: 'json')]
    #[Groups(['calendar:read', 'calendar:write'])]
    private array $monthsData = [];

    public function getId(): ?int
    {
        return $this->id;
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

    public function getMonthsData(): array
    {
        return $this->monthsData;
    }

    public function setMonthsData(array $monthsData): static
    {
        $this->monthsData = $monthsData;
        return $this;
    }
}
