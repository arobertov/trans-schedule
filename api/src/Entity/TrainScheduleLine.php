<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use App\Repository\TrainScheduleLineRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TrainScheduleLineRepository::class)]
#[ApiResource(
    description: 'Редове от разписанието',
    normalizationContext: ['groups' => ['ts_line:read']],
    denormalizationContext: ['groups' => ['ts_line:write']],
    mercure: true,
    paginationItemsPerPage: 100,
    paginationClientItemsPerPage: true,
    paginationMaximumItemsPerPage: 100000
)]
#[ApiFilter(SearchFilter::class, properties: [
    'train_number' => 'exact',
    'station_track' => 'partial',
    'trainSchedule' => 'exact'
])]
class TrainScheduleLine
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['ts_line:read', 'train_schedule:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'lines')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['ts_line:read', 'ts_line:write'])]
    private ?TrainSchedule $trainSchedule = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Номерът на влака е задължителен')]
    #[ApiProperty(description: 'Влак')]
    #[Groups(['ts_line:read', 'ts_line:write', 'train_schedule:read'])]
    private ?string $train_number = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Коловозът на станцията е задължителен')]
    #[ApiProperty(description: 'Коловоз на станция')]
    #[Groups(['ts_line:read', 'ts_line:write', 'train_schedule:read'])]
    private ?string $station_track = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[ApiProperty(description: 'Час на пристигане')]
    #[Groups(['ts_line:read', 'ts_line:write', 'train_schedule:read'])]
    private ?\DateTimeInterface $arrival_time = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    #[ApiProperty(description: 'Час на отпътуване')]
    #[Groups(['ts_line:read', 'ts_line:write', 'train_schedule:read'])]
    private ?\DateTimeInterface $departure_time = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getTrainNumber(): ?string
    {
        return $this->train_number;
    }

    public function setTrainNumber(string $train_number): static
    {
        $this->train_number = $train_number;

        return $this;
    }

    public function getStationTrack(): ?string
    {
        return $this->station_track;
    }

    public function setStationTrack(string $station_track): static
    {
        $this->station_track = $station_track;

        return $this;
    }

    public function getArrivalTime(): ?\DateTimeInterface
    {
        return $this->arrival_time;
    }

    public function setArrivalTime(?\DateTimeInterface $arrival_time): static
    {
        $this->arrival_time = $arrival_time;

        return $this;
    }

    public function getDepartureTime(): ?\DateTimeInterface
    {
        return $this->departure_time;
    }

    public function setDepartureTime(?\DateTimeInterface $departure_time): static
    {
        $this->departure_time = $departure_time;

        return $this;
    }
}
