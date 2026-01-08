<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\MatrixRepository;
use App\State\MatrixStateProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    description: 'Календарна матрица за конкретен порядък',
    mercure: true,
    normalizationContext: ['groups' => ['matrix:read']],
    denormalizationContext: ['groups' => ['matrix:write']],
    operations: [
        new GetCollection(paginationEnabled: false),
        new Post(processor: MatrixStateProcessor::class),
        new Get(),
        new Put(processor: MatrixStateProcessor::class),
        new Delete()
    ]
)]
#[ORM\Entity(repositoryClass: MatrixRepository::class)]
#[ORM\Table(name: 'matrices')]
class Matrix
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['matrix:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: OrderPattern::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Порядъкът е задължителен')]
    #[Groups(['matrix:read', 'matrix:write'])]
    private ?OrderPattern $pattern = null;

    #[ORM\Column(type: 'integer')]
    #[Assert\Range(min: 2020, max: 2100, notInRangeMessage: 'Годината трябва да е между 2020 и 2100')]
    #[ApiProperty(description: 'Година на матрицата', example: 2026)]
    #[Groups(['matrix:read', 'matrix:write'])]
    private ?int $year = null;

    #[ORM\Column(type: 'integer')]
    #[Assert\Range(min: 1, max: 12, notInRangeMessage: 'Месецът трябва да е между 1 и 12')]
    #[ApiProperty(description: 'Месец на матрицата (1-12)', example: 1)]
    #[Groups(['matrix:read', 'matrix:write'])]
    private ?int $month = null;

    #[ORM\Column(type: 'integer', options: ['default' => 1])]
    #[Assert\GreaterThan(value: 0, message: 'Началната позиция трябва да е положително число')]
    #[ApiProperty(description: 'Позиция от порядъка, от която започва генерирането', example: 12)]
    #[Groups(['matrix:read', 'matrix:write'])]
    private int $start_position = 1;

    #[ORM\Column(type: 'json', nullable: true)]
    #[ApiProperty(description: 'Заглавия на колоните (дата, ден от седмицата, тип ден)')]
    #[Groups(['matrix:read', 'matrix:write'])]
    private ?array $header = null;

    #[ORM\Column(name: 'matrix_rows', type: 'json', nullable: true)]
    #[ApiProperty(description: 'Редовете на матрицата с изчислени стойности')]
    #[Groups(['matrix:read'])]
    private ?array $rows = null;

    #[ORM\Column(type: 'datetime_immutable', options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['matrix:read'])]
    private ?\DateTimeInterface $created_at = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups(['matrix:read'])]
    private ?\DateTimeInterface $updated_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPattern(): ?OrderPattern
    {
        return $this->pattern;
    }

    public function setPattern(?OrderPattern $pattern): static
    {
        $this->pattern = $pattern;
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

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(int $month): static
    {
        $this->month = $month;
        return $this;
    }

    public function getStartPosition(): int
    {
        return $this->start_position;
    }

    public function setStartPosition(int $start_position): static
    {
        $this->start_position = $start_position;
        return $this;
    }

    public function getHeader(): ?array
    {
        return $this->header;
    }

    public function setHeader(?array $header): static
    {
        $this->header = $header;
        return $this;
    }

    public function getRows(): ?array
    {
        return $this->rows;
    }

    public function setRows(?array $rows): static
    {
        $this->rows = $rows;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->created_at;
    }

    public function setCreatedAt(?\DateTimeInterface $created_at): static
    {
        $this->created_at = $created_at;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updated_at;
    }

    public function setUpdatedAt(?\DateTimeInterface $updated_at): static
    {
        $this->updated_at = $updated_at;
        return $this;
    }
}
