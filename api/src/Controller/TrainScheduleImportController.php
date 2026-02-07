<?php

namespace App\Controller;

use App\Entity\TrainSchedule;
use App\Entity\TrainScheduleLine;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

#[AsController]
class TrainScheduleImportController extends AbstractController
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function __invoke(TrainSchedule $data, Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('memory_limit', '512M');
        
        $payload = $request->toArray();
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload');
        }

        // 1. Clear existing lines (Replace Mode)
        $scheduleId = $data->getId();
        
        // Check for append mode (if true, do not delete existing lines)
        $isAppend = $request->query->getBoolean('append', false);

        if (!$isAppend) {
            // Using DQL is safer and handles constraints correctly in Doctrine lifecycle
            $this->entityManager->createQuery('DELETE FROM App\Entity\TrainScheduleLine l WHERE l.trainSchedule = :schedule')
                ->setParameter('schedule', $data)
                ->execute();
        }
        
        // 2. Insert new lines
        $batchSize = 200;
        $i = 0;

        foreach ($payload as $row) {
             $line = new TrainScheduleLine();
             // Use getReference to avoid DB query after clear()
             $line->setTrainSchedule($this->entityManager->getReference(TrainSchedule::class, $scheduleId));
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
             }
        }
        
        $this->entityManager->flush();
        
        return new JsonResponse(['status' => 'success', 'count' => count($payload)]);
    }
}
