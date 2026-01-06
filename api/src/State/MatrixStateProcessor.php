<?php

namespace App\State;

use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Matrix;
use App\Service\MatrixGenerator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class MatrixStateProcessor implements ProcessorInterface
{
    public function __construct(
        private MatrixGenerator $generator,
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof Delete) {
            return $this->removeProcessor->process($data, $operation, $uriVariables, $context);
        }

        if ($data instanceof Matrix) {
            $this->generator->generate($data);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
