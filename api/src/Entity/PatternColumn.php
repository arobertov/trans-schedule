<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\PatternColumnRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\Metadata\ApiProperty;

#[ApiResource(
    description: 'Колони на порядък',
    mercure: true,
    normalizationContext: ['groups' => ['pattern_column:read']],
    denormalizationContext: ['groups' => ['pattern_column:write']]
)]
#[ORM\Entity(repositoryClass: PatternColumnRepository::class)]
#[ORM\Table(name: 'pattern_columns')]
#[ORM\UniqueConstraint(name: 'unique_column_per_pattern', columns: ['pattern_id', 'column_number'])]
class PatternColumn
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['pattern_column:read', 'pattern:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: OrderPattern::class, inversedBy: 'columns')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['pattern_column:write'])]
    private ?OrderPattern $pattern = null;

    #[ORM\Column(type: 'integer')]
    #[Assert\GreaterThan(value: 0, message: 'Номерът на колоната трябва да е положително число')]
    #[ApiProperty(description: 'Пореден номер на колоната', example: 1)]
    #[Groups(['pattern_column:read', 'pattern_column:write', 'pattern:read', 'pattern:write'])] // ДОБАВЕНО pattern:write
    private ?int $column_number = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank(message: 'Наименованието на колоната е задължително')]
    #[ApiProperty(description: 'Наименование на колоната', example: 'делничен_ден')]
    #[Groups(['pattern_column:read', 'pattern_column:write', 'pattern:read', 'pattern:write'])] // ДОБАВЕНО pattern:write
    private ?string $column_name = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Обозначението е задължително')]
    #[ApiProperty(description: 'Кратко обозначение (напр: Пн, ПД, ДП)', example: 'Пн')]
    #[Groups(['pattern_column:read', 'pattern_column:write', 'pattern:read', 'pattern:write'])] // ДОБАВЕНО pattern:write
    private ?string $label = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[ApiProperty(description: 'Описание на колоната')]
    #[Groups(['pattern_column:read', 'pattern_column:write', 'pattern:read', 'pattern:write'])] // ДОБАВЕНО pattern:write
    private ?string $description = null;

    #[ORM\Column(type: 'datetime', options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['pattern_column:read'])]
    private ?\DateTimeInterface $created_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTime();
    }

    // Getters and Setters
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

    public function getColumnNumber(): ?int
    {
        return $this->column_number;
    }

    public function setColumnNumber(int $column_number): static
    {
        $this->column_number = $column_number;
        return $this;
    }

    public function getColumnName(): ?string
    {
        return $this->column_name;
    }

    public function setColumnName(string $column_name): static
    {
        $this->column_name = $column_name;
        return $this;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function setLabel(string $label): static
    {
        $this->label = $label;
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

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->created_at;
    }
}