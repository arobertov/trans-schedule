<?php

namespace App\Entity;

use App\Repository\PositionsRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;

#[ORM\Entity(repositoryClass: PositionsRepository::class)]
#[ApiResource(
    mercure: true,
    // Дефинираме кои групи да се използват за четене и запис
    normalizationContext: ['groups' => ['position:read']], 
    denormalizationContext: ['groups' => ['position:write']]
)]
#[ApiFilter(OrderFilter::class, properties: ['name' => 'asc'])]
class Positions
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['position:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['position:read', 'position:write', 'employee:read'])]
    #[Assert\NotBlank(message: 'Името на длъжността е задължително')]
    #[Assert\Length(
        min: 2,
        max: 255,
        minMessage: 'Името на длъжността трябва да е поне {{ limit }} символа',
        maxMessage: 'Името на длъжността не може да бъде повече от {{ limit }} символа'
    )]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['position:read', 'position:write'])]
    private ?string $description = null;

    /**
     * @var Collection<int, Employees>
     */
    #[ORM\OneToMany(targetEntity: Employees::class, mappedBy: 'position')]
    #[Groups(['position:read'])]
    private Collection $employees;

    public function __construct()
    {
        $this->employees = new ArrayCollection();
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
     * @return Collection<int, Employees>
     */
    public function getEmployees(): Collection
    {
        return $this->employees;
    }

    public function addEmployee(Employees $employee): static
    {
        if (!$this->employees->contains($employee)) {
            $this->employees->add($employee);
            $employee->setPosition($this);
        }

        return $this;
    }

    public function removeEmployee(Employees $employee): static
    {
        if ($this->employees->removeElement($employee)) {
            // set the owning side to null (unless already changed)
            if ($employee->getPosition() === $this) {
                $employee->setPosition(null);
            }
        }

        return $this;
    }
}
