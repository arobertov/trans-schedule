<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Calendar;
use App\Service\CalendarService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class CalendarStateProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private CalendarService $calendarService,
        private EntityManagerInterface $entityManager
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = [])
    {
        if ($data instanceof Calendar) {
            // Automatically generate data if not provided (or if we want to force refresh logic)
            // We assume if 'monthsData' is empty, we should fetch it.
            if (empty($data->getMonthsData()) && $data->getYear()) {
                
                // Fetch data from service for ALL months
                $calendarData = $this->calendarService->getYearlyCalendarData($data->getYear());
                $data->setMonthsData($calendarData);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
