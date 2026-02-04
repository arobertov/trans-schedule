<?php

namespace App\Repository;

use App\Entity\TrainScheduleLine;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TrainScheduleLine>
 *
 * @method TrainScheduleLine|null find($id, $lockMode = null, $lockVersion = null)
 * @method TrainScheduleLine|null findOneBy(array $criteria, array $orderBy = null)
 * @method TrainScheduleLine[]    findAll()
 * @method TrainScheduleLine[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TrainScheduleLineRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TrainScheduleLine::class);
    }
}
