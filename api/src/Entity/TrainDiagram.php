<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Delete;
use App\Repository\TrainDiagramRepository;
use App\State\TrainDiagramProcessor; // We will create this
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TrainDiagramRepository::class)]
#[ApiResource(
    description: 'Диаграма на влак (Маршрут)',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Delete()
    ],
    normalizationContext: ['groups' => ['diagram:read']],
    denormalizationContext: ['groups' => ['diagram:write']],
    mercure: true
)]
class TrainDiagram
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['diagram:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Името на диаграмата е задължително')]
    #[Groups(['diagram:read', 'diagram:write'])]
    private ?string $name = null;

    #[ORM\ManyToOne(targetEntity: TrainSchedule::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['diagram:read', 'diagram:write'])]
    private ?TrainSchedule $trainSchedule = null;

    #[ORM\Column(type: 'json')]
    #[Groups(['diagram:read', 'diagram:write'])]
    private array $stations = [];

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

    public function getTrainSchedule(): ?TrainSchedule
    {
        return $this->trainSchedule;
    }

    public function setTrainSchedule(?TrainSchedule $trainSchedule): static
    {
        $this->trainSchedule = $trainSchedule;

        return $this;
    }

    public function getStations(): array
    {
        return $this->stations;
    }

    public function setStations(array $stations): static
    {
        $this->stations = $stations;

        return $this;
    }
}
