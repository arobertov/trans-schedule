<?php

namespace App\Entity;

use App\Repository\ShiftScheduleDetailsRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ShiftScheduleDetailsRepository::class)]
#[ApiResource(
    description: 'В график – график на маршрути и места по смяна',
    mercure: true,
    normalizationContext: ['groups' => ['shift_detail:read']], 
    denormalizationContext: ['groups' => ['shift_detail:write']],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true
)]
#[ApiFilter(SearchFilter::class, properties: [
    'shift_schedule' => 'exact',
    'pickup_location' => 'partial',
    'dropoff_location' => 'partial'
])]
#[ORM\HasLifecycleCallbacks]
class ShiftScheduleDetails
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['shift_detail:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ShiftSchedules::class, inversedBy: 'details')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotNull(message: 'График на смяната е задължителен')]
    #[ApiProperty(
        description: 'График на смяната'
    )]
    private ?ShiftSchedules $shift_schedule = null;

    #[ORM\Column(type: Types::INTEGER)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'Маршрутът е задължителен')]
    #[Assert\PositiveOrZero(message: 'Маршрутът не може да е отрицателен')]
    #[ApiProperty(
        description: 'Маршрут',
        example: 1
    )]
    private ?int $route = null;

    #[ORM\Column(length: 255)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'Място на качване е задължително')]
    #[Assert\Length(
        min: 1,
        max: 255,
        minMessage: 'Място на качване трябва да е поне {{ limit }} символа',
        maxMessage: 'Място на качване не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Място на качване',
        example: 'Автогара Запад'
    )]
    private ?string $pickup_location = null;

    #[ORM\Column(type: Types::INTEGER)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'Път № за качване е задължителен')]
    #[Assert\PositiveOrZero(message: 'Път № за качване не може да е отрицателен')]
    #[ApiProperty(
        description: 'Път № за качване',
        example: 5
    )]
    private ?int $pickup_route_number = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'В график (време) е задължително')]
    #[ApiProperty(
        description: 'В график (време на пътуване)',
        example: '08:00'
    )]
    private ?\DateTimeInterface $in_schedule = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'От график (време) е задължително')]
    #[ApiProperty(
        description: 'От график (време на завършване)',
        example: '16:00'
    )]
    private ?\DateTimeInterface $from_schedule = null;

    #[ORM\Column(length: 255)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'Място на слизане е задължително')]
    #[Assert\Length(
        min: 1,
        max: 255,
        minMessage: 'Място на слизане трябва да е поне {{ limit }} символа',
        maxMessage: 'Място на слизане не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Място на слизане',
        example: 'Автогара Изток'
    )]
    private ?string $dropoff_location = null;

    #[ORM\Column(type: Types::INTEGER)]
    #[Groups(['shift_detail:read', 'shift_detail:write'])]
    #[Assert\NotBlank(message: 'Път № (слизане) е задължителен')]
    #[Assert\PositiveOrZero(message: 'Път № (слизане) не може да е отрицателен')]
    #[ApiProperty(
        description: 'Път № (слизане)',
        example: 7
    )]
    private ?int $dropoff_route_number = null;

    #[ORM\Column]
    #[Groups(['shift_detail:read'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['shift_detail:read'])]
    #[ApiProperty(
        description: 'Дата на последна промяна',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $updated_at = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getShiftSchedule(): ?ShiftSchedules
    {
        return $this->shift_schedule;
    }

    public function setShiftSchedule(?ShiftSchedules $shift_schedule): static
    {
        $this->shift_schedule = $shift_schedule;
        return $this;
    }

    public function getRoute(): ?int
    {
        return $this->route;
    }

    public function setRoute(int $route): static
    {
        $this->route = $route;
        return $this;
    }

    public function getPickupLocation(): ?string
    {
        return $this->pickup_location;
    }

    public function setPickupLocation(string $pickup_location): static
    {
        $this->pickup_location = $pickup_location;
        return $this;
    }

    public function getPickupRouteNumber(): ?int
    {
        return $this->pickup_route_number;
    }

    public function setPickupRouteNumber(int $pickup_route_number): static
    {
        $this->pickup_route_number = $pickup_route_number;
        return $this;
    }

    public function getInSchedule(): ?string
    {
        return $this->in_schedule?->format('H:i');
    }

    public function setInSchedule(string|\DateTimeInterface $in_schedule): static
    {
        if (is_string($in_schedule)) {
            $this->in_schedule = \DateTime::createFromFormat('H:i', $in_schedule);
        } else {
            $this->in_schedule = $in_schedule;
        }
        return $this;
    }

    public function getFromSchedule(): ?string
    {
        return $this->from_schedule?->format('H:i');
    }

    public function setFromSchedule(string|\DateTimeInterface $from_schedule): static
    {
        if (is_string($from_schedule)) {
            $this->from_schedule = \DateTime::createFromFormat('H:i', $from_schedule);
        } else {
            $this->from_schedule = $from_schedule;
        }
        return $this;
    }

    public function getDropoffLocation(): ?string
    {
        return $this->dropoff_location;
    }

    public function setDropoffLocation(string $dropoff_location): static
    {
        $this->dropoff_location = $dropoff_location;
        return $this;
    }

    public function getDropoffRouteNumber(): ?int
    {
        return $this->dropoff_route_number;
    }

    public function setDropoffRouteNumber(int $dropoff_route_number): static
    {
        $this->dropoff_route_number = $dropoff_route_number;
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
