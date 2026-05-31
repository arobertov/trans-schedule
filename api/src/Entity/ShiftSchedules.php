<?php

namespace App\Entity;

use App\Repository\ShiftSchedulesRepository;
use App\Enum\ShiftScheduleStatus;
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
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ShiftSchedulesRepository::class)]
#[ApiResource(
    description: 'Графици на смените (Групи от графици на смени)',
    mercure: true,
    normalizationContext: ['groups' => ['schedule:read']], 
    denormalizationContext: ['groups' => ['schedule:write']],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true,
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['schedule:list']]),
        new Get(),
        new Post(),
        new Put(),
        new Patch(),
        new Delete(),
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial',
    'status' => 'exact'
])]
#[ORM\HasLifecycleCallbacks]
class ShiftSchedules
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['schedule:read', 'schedule:list', 'shift_detail:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['schedule:read', 'schedule:list', 'schedule:write', 'shift_detail:read'])]
    #[Assert\NotBlank(message: 'Името на графика е задължително')]
    #[Assert\Length(
        min: 1,
        max: 255,
        minMessage: 'Името трябва да е поне {{ limit }} символа',
        maxMessage: 'Името не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Име на графика',
        example: 'Делник/Празник от 02.02.2026г.'
    )]
    private ?string $name = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['schedule:read', 'schedule:list', 'schedule:write'])]
    #[ApiProperty(
        description: 'Описание на графика',
        example: 'Зимен/Летен със 16/11 смени.'
    )]
    private ?string $description = null;

    #[ORM\OneToMany(targetEntity: ShiftScheduleDetails::class, mappedBy: 'shift_schedule', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['schedule:read', 'schedule:list', 'schedule:write'])]
    #[ApiProperty(
        description: 'Смени в този график',
        readableLink: false,
        writableLink: false
    )]
    private Collection $details;

    #[ORM\Column]
    #[Groups(['schedule:read', 'schedule:list'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['schedule:read', 'schedule:list'])]
    #[ApiProperty(
        description: 'Дата на последна промяна',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $updated_at = null;

    #[ORM\Column(length: 20, enumType: ShiftScheduleStatus::class)]
    #[Groups(['schedule:read', 'schedule:list', 'schedule:write'])]
    #[ApiProperty(
        description: 'Статус на графика (проект/активен)',
        example: 'проект'
    )]
    private ShiftScheduleStatus $status = ShiftScheduleStatus::Draft;

    #[ORM\OneToOne(mappedBy: 'schedule', targetEntity: ShiftScheduleWorkbook::class, cascade: ['persist', 'remove'], fetch: 'LAZY', orphanRemoval: true)]
    private ?ShiftScheduleWorkbook $workbook = null;

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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
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

    public function getStatus(): ShiftScheduleStatus
    {
        return $this->status;
    }

    public function setStatus(ShiftScheduleStatus $status): static
    {
        $this->status = $status;
        return $this;
    }

    #[SerializedName('workbook_snapshot')]
    #[Groups(['schedule:read'])]
    #[ApiProperty(
        description: 'Снимка на работната книга (Univer формат)',
        readable: true,
        writable: false
    )]
    public function getWorkbookSnapshot(): ?array
    {
        return $this->workbook?->getSnapshot();
    }

    #[SerializedName('workbook_snapshot')]
    #[Groups(['schedule:write'])]
    public function setWorkbookSnapshot(?array $workbook_snapshot): static
    {
        if ($workbook_snapshot === null) {
            $this->workbook = null;
        } else {
            if ($this->workbook === null) {
                $this->workbook = new ShiftScheduleWorkbook();
                $this->workbook->setSchedule($this);
            }
            $this->workbook->setSnapshot($workbook_snapshot);
        }
        return $this;
    }
}
