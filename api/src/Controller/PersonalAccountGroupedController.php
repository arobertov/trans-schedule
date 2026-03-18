<?php

namespace App\Controller;

use App\Repository\PersonalAccountRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
final readonly class PersonalAccountGroupedController
{
    public function __construct(private PersonalAccountRepository $personalAccountRepository)
    {
    }

    #[Route('/personal_accounts_grouped', name: 'personal_accounts_grouped', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'items' => $this->personalAccountRepository->getGroupedByYearMonth(),
        ]);
    }
}
