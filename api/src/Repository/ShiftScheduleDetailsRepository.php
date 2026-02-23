<?php

namespace App\Repository;

use App\Entity\ShiftScheduleDetails;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ShiftScheduleDetails>
 */
class ShiftScheduleDetailsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ShiftScheduleDetails::class);
    }
}
