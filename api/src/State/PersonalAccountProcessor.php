<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\PersonalAccount;
use App\Service\PersonalAccountCalculator;

final readonly class PersonalAccountProcessor implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor,
        private PersonalAccountCalculator $personalAccountCalculator,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof PersonalAccount) {
            $this->personalAccountCalculator->recalculate($data);
        }

        return $this->processor->process($data, $operation, $uriVariables, $context);
    }
}
