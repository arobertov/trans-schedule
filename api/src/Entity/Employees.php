<?php

namespace App\Entity;

use App\Enum\Status;
use App\Repository\EmployeesRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/*
 
*/

#[ORM\Entity(repositoryClass: EmployeesRepository::class)]
#[ApiResource(
    description: 'Служители в компанията',
    mercure: true,
    normalizationContext: ['groups' => ['employee:read']], 
    denormalizationContext: ['groups' => ['employee:write']],
    operations: [
        new Get(description: 'Преглед на служител'),
        new GetCollection(description: 'Списък със служители'),
        new Post(description: 'Добавяне на нов служител'),
        new Put(description: 'Пълна актуализация на служител'),
        new Patch(description: 'Частична актуализация на служител'),
        new Delete(description: 'Изтриване на служител')
    ],
    paginationItemsPerPage: 30,
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true
)]
#[ApiFilter(SearchFilter::class, properties: [
    'position' => 'exact',
    'status' => 'exact',
    'first_name' => 'partial',
    'last_name' => 'partial',
    'email' => 'partial'
])]
#[ORM\HasLifecycleCallbacks]
class Employees
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['employee:read'])]
    #[ApiProperty(
        identifier: true,
        description: 'Уникален идентификатор'
    )]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\NotBlank(message: 'Първото име е задължително')]
    #[Assert\Length(
        min: 2,
        max: 255,
        minMessage: 'Първото име трябва да е поне {{ limit }} символа',
        maxMessage: 'Първото име не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Първо име',
        example: 'Иван'
    )]
    private ?string $first_name = null;

    #[ORM\Column(length: 255)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\NotBlank(message: 'Бащиното име е задължително')]
    #[Assert\Length(
        min: 2,
        max: 255,
        minMessage: 'Бащиното име трябва да е поне {{ limit }} символа',
        maxMessage: 'Бащиното име не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Бащино име',
        example: 'Петров'
    )]
    private ?string $middle_name = null;

    #[ORM\Column(length: 255)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\NotBlank(message: 'Фамилията е задължителна')]
    #[Assert\Length(
        min: 2,
        max: 255,
        minMessage: 'Фамилията трябва да е поне {{ limit }} символа',
        maxMessage: 'Фамилията не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Фамилия',
        example: 'Иванов'
    )]
    private ?string $last_name = null;

    #[ORM\Column(length: 35, nullable: true)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\Regex(
        pattern: '/^(?:\+359|0)8[789]\d{7}$/',
        message: 'Моля, въведете валиден български мобилен номер (напр. 0878123456 или +359878123456)'
    )]
    #[ApiProperty(
        description: 'Мобилен телефон',
        example: '+359878123456',
        openapiContext: [
            'type' => 'string',
            'format' => 'phone'
        ]
    )]
    private ?string $phone = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\Email(message: 'Моля, въведете валиден имейл адрес')]
    #[Assert\Length(
        max: 255,
        maxMessage: 'Имейлът не може да бъде повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Имейл адрес',
        example: 'ivan.ivanov@company.bg',
        openapiContext: [
            'type' => 'string',
            'format' => 'email'
        ]
    )]
    private ?string $email = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\Length(
        max: 5000,
        maxMessage: 'Бележките не могат да бъдат повече от {{ limit }} символа'
    )]
    #[ApiProperty(
        description: 'Допълнителни бележки',
        openapiContext: [
            'type' => 'string',
            'format' => 'textarea'
        ]
    )]
    private ?string $notes = null;

    #[ORM\Column]
    #[Groups(['employee:read'])]
    #[ApiProperty(
        description: 'Дата на създаване',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $created_at = null;

    #[ORM\Column]
    #[Groups(['employee:read'])]
    #[ApiProperty(
        description: 'Дата на последна промяна',
        readable: true,
        writable: false
    )]
    private ?\DateTimeImmutable $updated_at = null;

    #[ORM\Column(enumType: Status::class)]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\NotNull(message: 'Статусът е задължителен')]
    #[ApiProperty(
        description: 'Статус на служителя',
        openapiContext: [
            'type' => 'string',
            'enum' => ['активен', 'неактивен', 'напуснал'] // Замени с реалните стойности от твоя enum
        ]
    )]
    private ?Status $status = null;

    #[ORM\ManyToOne(inversedBy: 'employees')]
    #[Groups(['employee:read', 'employee:write'])]
    #[Assert\NotNull(message: 'Позицията е задължителна')]
    #[ApiProperty(
        description: 'Длъжност/позиция',
        readableLink: true,
        writableLink: false
    )]
    private ?Positions $position = null;

   

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFirstName(): ?string
    {
        return $this->first_name;
    }

    public function setFirstName(string $first_name): static
    {
        $this->first_name = $first_name;
        return $this;
    }

    public function getMiddleName(): ?string
    {
        return $this->middle_name;
    }

    public function setMiddleName(string $middle_name): static
    {
        $this->middle_name = $middle_name;
        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->last_name;
    }

    public function setLastName(string $last_name): static
    {
        $this->last_name = $last_name;
        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        if ($phone && str_starts_with($phone, '0')) {
            $phone = '+359' . substr($phone, 1);
        }
        $this->phone = $phone;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;
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

    public function getStatus(): ?Status
    {
        return $this->status;
    }

    public function setStatus(Status $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getPosition(): ?Positions
    {
        return $this->position;
    }

    public function setPosition(?Positions $position): static
    {
        $this->position = $position;
        return $this;
    }
}