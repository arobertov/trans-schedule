<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\OrderPatternDetailsRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\Metadata\ApiProperty;

#[ApiResource(
    description: 'Детайли на порядък - стойности за всяка позиция',
    mercure: true,
    normalizationContext: ['groups' => ['pattern_detail:read']],
    denormalizationContext: ['groups' => ['pattern_detail:write']],
    order: ['position_number' => 'ASC'],
    operations: [
        new GetCollection(paginationEnabled: false),
        new Post(),
        new Get(),
        new Put(),
        new Delete()
    ]
)]
#[ORM\Entity(repositoryClass: OrderPatternDetailsRepository::class)]
#[ORM\Table(name: 'order_pattern_details')]
#[ORM\UniqueConstraint(name: 'unique_position_per_pattern', columns: ['pattern_id', 'position_number'])]
class OrderPatternDetails
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['pattern_detail:read', 'pattern:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: OrderPattern::class, inversedBy: 'details')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['pattern_detail:read', 'pattern_detail:write'])]
    private ?OrderPattern $pattern = null;

    #[ORM\Column(type: 'integer')]
    #[Assert\GreaterThan(value: 0, message: 'Номерът на позицията трябва да е положително число')]
    #[ApiProperty(description: 'Номер на позицията ', example: 1)]
    #[Groups(['pattern_detail:read', 'pattern_detail:write', 'pattern:read'])]
    private ?int $position_number = null;

    #[ORM\Column(type: 'json', name: '`values`')]
    #[ApiProperty(
        description: 'JSON обект със стойности за всяка колона (може да съдържа празни стойности)',
        example: '{"СМ1-Д": "МД-Н", "СМ1-Н": "МД-Д", "СМ2-Д": "", "СМ2-Н": ""}'
    )]
    #[Groups(['pattern_detail:read', 'pattern_detail:write', 'pattern:read'])]
    private array $values = [];

    #[ORM\Column(type: 'datetime', options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['pattern_detail:read', 'pattern:read'])]
    private ?\DateTimeInterface $created_at = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    #[Groups(['pattern_detail:read', 'pattern:read'])]
    private ?\DateTimeInterface $updated_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTime();
        $this->values = [];
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

    public function getPositionNumber(): ?int
    {
        return $this->position_number;
    }

    public function setPositionNumber(int $position_number): static
    {
        $this->position_number = $position_number;
        return $this;
    }

    public function getValues(): array
    {
        return $this->values;
    }

    public function setValues(array $values): static
    {
        $this->values = $values;
        $this->updated_at = new \DateTime();
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->created_at;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updated_at;
    }
}