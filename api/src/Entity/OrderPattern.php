<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\OrderPatternRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\Metadata\ApiProperty;

#[ApiResource(
    description: 'Порядък на смяна с динамични колони',
    mercure: true,
    normalizationContext: ['groups' => ['pattern:read']],
    denormalizationContext: ['groups' => ['pattern:write']],
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Delete()
    ]
)]
#[ORM\Entity(repositoryClass: OrderPatternRepository::class)]
#[ORM\Table(name: 'order_patterns')]
class OrderPattern
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['pattern:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 100, unique: true)]
    #[Assert\NotBlank(message: 'Наименованието на порядъка е задължително')]
    #[Assert\Length(max: 100, maxMessage: 'Наименованието не може да е по-дълго от 100 символа')]
    #[ApiProperty(description: 'Наименование на порядъка', example: 'порядък_92')]
    #[Groups(['pattern:read', 'pattern:write'])]
    private ?string $name = null;

    #[ORM\Column]
    #[Assert\GreaterThan(value: 1, message: 'Трябват минимум 2 позиции')]
    #[ApiProperty(description: 'Общ брой позиции в порядъка', example: 92)]
    #[Groups(['pattern:read', 'pattern:write'])]
    private ?int $total_positions = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[ApiProperty(description: 'Активен ли е порядъкът', example: true)]
    #[Groups(['pattern:read', 'pattern:write'])]
    private bool $is_active = false;

    #[ORM\Column(type: 'text', nullable: true)]
    #[ApiProperty(description: 'Описание на порядъка')]
    #[Groups(['pattern:read', 'pattern:write'])]
    private ?string $description = null;

    #[ORM\OneToMany(targetEntity: PatternColumn::class, mappedBy: 'pattern', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['column_number' => 'ASC'])]
    #[Groups(['pattern:read', 'pattern:write'])] // ДОБАВЕНО pattern:write
    private Collection $columns;

    #[ORM\OneToMany(targetEntity: OrderPatternDetails::class, mappedBy: 'pattern', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['position_number' => 'ASC'])]
    #[Groups(['pattern:read'])]
    private Collection $details;

    #[ORM\Column(type: 'datetime', options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['pattern:read'])]
    private ?\DateTimeInterface $created_at = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    #[Groups(['pattern:read'])]
    private ?\DateTimeInterface $updated_at = null;

    public function __construct()
    {
        $this->columns = new ArrayCollection();
        $this->details = new ArrayCollection();
        $this->created_at = new \DateTime();
        $this->is_active = false;
    }

    // Getters and Setters
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getTotalPositions(): ?int
    {
        return $this->total_positions;
    }

    public function setTotalPositions(int $total_positions): static
    {
        $this->total_positions = $total_positions;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function setIsActive(bool $is_active): static
    {
        $this->is_active = $is_active;
        $this->updated_at = new \DateTime();
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

    public function getColumns(): Collection
    {
        return $this->columns;
    }

    public function addColumn(PatternColumn $column): static
    {
        if (!$this->columns->contains($column)) {
            $this->columns->add($column);
            $column->setPattern($this);
        }
        return $this;
    }

    public function removeColumn(PatternColumn $column): static
    {
        if ($this->columns->removeElement($column)) {
            if ($column->getPattern() === $this) {
                $column->setPattern(null);
            }
        }
        return $this;
    }

    public function getDetails(): Collection
    {
        return $this->details;
    }

    public function addDetail(OrderPatternDetails $detail): static
    {
        if (!$this->details->contains($detail)) {
            $this->details->add($detail);
            $detail->setPattern($this);
        }
        return $this;
    }

    public function removeDetail(OrderPatternDetails $detail): static
    {
        if ($this->details->removeElement($detail)) {
            if ($detail->getPattern() === $this) {
                $detail->setPattern(null);
            }
        }
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