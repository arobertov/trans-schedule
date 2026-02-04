<?php

namespace App\Controller;

use App\Entity\TrainSchedule;
use App\Entity\TrainScheduleLine;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

#[AsController]
class TrainScheduleImportController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function __invoke(TrainSchedule $data, Request $request): TrainSchedule
    {
        $payload = $request->toArray();
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload');
        }

        // 1. Clear existing lines (Replace Mode)
        // Using DQL is safer and handles constraints correctly in Doctrine lifecycle
        $this->entityManager->createQuery('DELETE FROM App\Entity\TrainScheduleLine l WHERE l.trainSchedule = :schedule')
            ->setParameter('schedule', $data)
            ->execute();
        
        // 2. Insert new lines
        $batchSize = 100;
        $i = 0;

        foreach ($payload as $row) {
             $line = new TrainScheduleLine();
             $line->setTrainSchedule($data);
             $line->setTrainNumber((string)($row['train_number'] ?? ''));
             $line->setStationTrack((string)($row['station_track'] ?? ''));
             
             if (!empty($row['arrival_time'])) {
                 try {
                    $line->setArrivalTime(new \DateTime($row['arrival_time']));
                 } catch (\Exception $e) {
                     // Ignore invalid time or handle error
                 }
             }
             if (!empty($row['departure_time'])) {
                try {
                    $line->setDepartureTime(new \DateTime($row['departure_time']));
                 } catch (\Exception $e) {
                     // Ignore
                 }
             }
             
             $this->entityManager->persist($line);
             
             if (($i++ % $batchSize) === 0) {
                 $this->entityManager->flush();
                 $this->entityManager->clear(); // Detach objects to save memory
                 // Re-fetch the main object because clear() detached it
                 $data = $this->entityManager->find(TrainSchedule::class, $data->getId());
             }
        }
        
        $this->entityManager->flush();
        
        // Refresh the main object to return it with updated lines (though lines are fetched separately usually)
        return $data;
    }
}
