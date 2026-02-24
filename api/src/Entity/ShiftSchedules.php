<?php

namespace App\Entity;

use App\Repository\ShiftSchedulesRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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
    description: 'Графици (Групи от смени)',
    mercure: true,
    normalizationContext: ['groups' => ['schedule:read']], 
    denormalizationContext: ['groups' => ['schedule:write']],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true,
    operations: [
        new GetCollection(),
        new Get(),
        new Post(),
        new Put(),
        new Patch(),
        new Delete(),
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial'
])]
#[ORM\HasLifecycleCallbacks]
class ShiftSchedules
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['schedule:read', 'shift_detail:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['schedule:read', 'schedule:write', 'shift_detail:read'])]
    #[Assert\NotBlank(message: 'Името на графика е задължително')]
    #[Assert\Length(
        min: 1,
        max: 255,
        minMessage: 'Името трябва да е поне {{ limit }} символа',
        maxMessage: 'Името не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Име на графика',
        example: 'График Януари 2026'
    )]
    private ?string $name = null;

    #[ORM\OneToMany(targetEntity: ShiftScheduleDetails::class, mappedBy: 'shift_schedule', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['schedule:read', 'schedule:write'])]
    #[ApiProperty(
        description: 'Смени в този график'
    )]
    private Collection $details;

    #[ORM\Column]
    #[Groups(['schedule:read'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['schedule:read'])]
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

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
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
    }
}
