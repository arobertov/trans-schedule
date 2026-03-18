<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\MonthlySchedule;
use App\Service\PersonalAccountCalculator;

final readonly class MonthlyScheduleStateProcessor implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor,
        private PersonalAccountCalculator $personalAccountCalculator,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        $result = $this->processor->process($data, $operation, $uriVariables, $context);

        if ($result instanceof MonthlySchedule) {
            $this->personalAccountCalculator->recalculateForMonthlySchedule($result);
        }

        return $result;
    }
}
