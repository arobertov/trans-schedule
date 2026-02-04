<?php

namespace App\Repository;

use App\Entity\TrainSchedule;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TrainSchedule>
 *
 * @method TrainSchedule|null find($id, $lockMode = null, $lockVersion = null)
 * @method TrainSchedule|null findOneBy(array $criteria, array $orderBy = null)
 * @method TrainSchedule[]    findAll()
 * @method TrainSchedule[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TrainScheduleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TrainSchedule::class);
    }
}
