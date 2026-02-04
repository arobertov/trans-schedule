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
        new Post(processor: TrainDiagramProcessor::class),
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

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Номерът на влака е задължителен')]
    #[Groups(['diagram:read', 'diagram:write'])]
    private ?string $train_number = null;

    #[ORM\Column(type: 'json')]
    #[Groups(['diagram:read', 'diagram:write'])]
    private array $intermediate_stations = [];

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['diagram:read'])]
    private ?string $start_station = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['diagram:read'])]
    private ?string $end_station = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTrainNumber(): ?string
    {
        return $this->train_number;
    }

    public function setTrainNumber(string $train_number): static
    {
        $this->train_number = $train_number;

        return $this;
    }

    public function getIntermediateStations(): array
    {
        return $this->intermediate_stations;
    }

    public function setIntermediateStations(array $intermediate_stations): static
    {
        $this->intermediate_stations = $intermediate_stations;

        return $this;
    }

    public function getStartStation(): ?string
    {
        return $this->start_station;
    }

    public function setStartStation(?string $start_station): static
    {
        $this->start_station = $start_station;

        return $this;
    }

    public function getEndStation(): ?string
    {
        return $this->end_station;
    }

    public function setEndStation(?string $end_station): static
    {
        $this->end_station = $end_station;

        return $this;
    }
}
