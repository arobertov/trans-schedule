<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\TrainDiagram;
use App\Repository\TrainScheduleLineRepository;
use Doctrine\ORM\EntityManagerInterface;

class TrainDiagramProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private TrainScheduleLineRepository $lineRepository
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = [])
    {
        if ($data instanceof TrainDiagram) {
            $trainNumber = $data->getTrainNumber();

            // Fetch generic lines for this train number
            $lines = $this->lineRepository->findBy(['train_number' => $trainNumber]);

            if (!empty($lines)) {
                // Sort lines by time to find first and last station
                // Priority: Departure time, then Arrival time
                usort($lines, function ($a, $b) {
                    $timeA = $a->getDepartureTime() ?? $a->getArrivalTime();
                    $timeB = $b->getDepartureTime() ?? $b->getArrivalTime();

                    if (!$timeA && !$timeB) return 0;
                    if (!$timeA) return 1;
                    if (!$timeB) return -1;
                    
                    // Simple comparsion triggers issues with midnight crossing (e.g. 23:50 vs 00:10).
                    // For now, standard Time comparison. 
                    // To handle Day+1 properly, we'd need date info or complex logic.
                    // Assuming linear time for creating the diagram metadata.
                    return $timeA <=> $timeB;
                });

                $first = $lines[0];
                $last = end($lines);

                $data->setStartStation($first->getStationTrack());
                $data->setEndStation($last->getStationTrack());
            }
        }

        $this->entityManager->persist($data);
        $this->entityManager->flush();

        return $data;
    }
}
