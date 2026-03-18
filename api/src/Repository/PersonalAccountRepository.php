<?php

namespace App\Repository;

use App\Entity\Employees;
use App\Entity\PersonalAccount;
use App\Entity\Positions;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PersonalAccount>
 */
class PersonalAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PersonalAccount::class);
    }

    public function findOneByEmployeePeriod(Employees $employee, Positions $position, int $year, int $month): ?PersonalAccount
    {
        return $this->findOneBy([
            'employee' => $employee,
            'position' => $position,
            'year' => $year,
            'month' => $month,
        ]);
    }

    /**
     * @return array<int, array{year:int, month:int, total:int}>
     */
    public function getGroupedByYearMonth(): array
    {
        $rows = $this->createQueryBuilder('pa')
            ->select('pa.year AS year', 'pa.month AS month', 'COUNT(pa.id) AS total')
            ->groupBy('pa.year, pa.month')
            ->orderBy('pa.year', 'DESC')
            ->addOrderBy('pa.month', 'DESC')
            ->getQuery()
            ->getArrayResult();

        return array_map(static fn (array $row): array => [
            'year' => (int) ($row['year'] ?? 0),
            'month' => (int) ($row['month'] ?? 0),
            'total' => (int) ($row['total'] ?? 0),
        ], $rows);
    }
}
