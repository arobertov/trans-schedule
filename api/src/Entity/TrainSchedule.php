<?php

namespace App\Entity;

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
use App\Controller\TrainScheduleImportController;
use App\Repository\TrainScheduleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\OpenApi\Model\Operation as OpenApiOperation;
use ApiPlatform\OpenApi\Model\RequestBody;
use ApiPlatform\OpenApi\Model\MediaType;
use ApiPlatform\OpenApi\Model\Schema;
use App\Dto\TrainScheduleImportLine;

#[ORM\Entity(repositoryClass: TrainScheduleRepository::class)]
#[ApiResource(
    description: 'Разписание на влаковете',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Put(),
        new Patch(),
        new Delete(),
        new Post(
            uriTemplate: '/train_schedules/{id}/import',
            controller: TrainScheduleImportController::class,
            openapi: new OpenApiOperation(
                summary: 'Масов импорт на редове от разписание (Replace mode)',
                description: 'Изтрива всички съществуващи редове за това разписание и импортира новите.',
                requestBody: new RequestBody(
                    content: new \ArrayObject([
                        'application/json' => new MediaType(
                            schema: new \ArrayObject([
                                'type' => 'array',
                                'items' => new \ArrayObject([
                                    'type' => 'object',
                                    'properties' => [
                                        'train_number' => ['type' => 'string'],
                                        'station_track' => ['type' => 'string'],
                                        'arrival_time' => ['type' => 'string', 'nullable' => true],
                                        'departure_time' => ['type' => 'string', 'nullable' => true],
                                    ]
                                ])
                            ])
                        )
                    ])
                )
            ),
            name: 'import_lines'
        )
    ],
    normalizationContext: ['groups' => ['train_schedule:read']],
    denormalizationContext: ['groups' => ['train_schedule:write']],
    mercure: true
)]
class TrainSchedule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['train_schedule:read', 'ts_line:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Името е задължително')]
    #[ApiProperty(description: 'Име на разписанието')]
    #[Groups(['train_schedule:read', 'train_schedule:write', 'ts_line:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[ApiProperty(description: 'Описание')]
    #[Groups(['train_schedule:read', 'train_schedule:write'])]
    private ?string $description = null;

    #[ORM\OneToMany(mappedBy: 'trainSchedule', targetEntity: TrainScheduleLine::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['train_schedule:read'])]
    private Collection $lines;

    public function __construct()
    {
        $this->lines = new ArrayCollection();
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
     * @return Collection<int, TrainScheduleLine>
     */
    public function getLines(): Collection
    {
        return $this->lines;
    }

    public function addLine(TrainScheduleLine $line): static
    {
        if (!$this->lines->contains($line)) {
            $this->lines->add($line);
            $line->setTrainSchedule($this);
        }

        return $this;
    }

    public function removeLine(TrainScheduleLine $line): static
    {
        if ($this->lines->removeElement($line)) {
            // set the owning side to null (unless already changed)
            if ($line->getTrainSchedule() === $this) {
                $line->setTrainSchedule(null);
            }
        }

        return $this;
    }
}
