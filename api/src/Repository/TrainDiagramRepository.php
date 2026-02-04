<?php

namespace App\Repository;

use App\Entity\TrainDiagram;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TrainDiagram>
 *
 * @method TrainDiagram|null find($id, $lockMode = null, $lockVersion = null)
 * @method TrainDiagram|null findOneBy(array $criteria, array $orderBy = null)
 * @method TrainDiagram[]    findAll()
 * @method TrainDiagram[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TrainDiagramRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TrainDiagram::class);
    }
}
