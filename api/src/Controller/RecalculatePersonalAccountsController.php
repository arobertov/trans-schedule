<?php

namespace App\Controller;

use App\Entity\MonthlySchedule;
use App\Service\PersonalAccountCalculator;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
final readonly class RecalculatePersonalAccountsController
{
    public function __construct(private PersonalAccountCalculator $personalAccountCalculator)
    {
    }

    public function __invoke(MonthlySchedule $data): JsonResponse
    {
        $count = $this->personalAccountCalculator->recalculateForMonthlySchedule($data);

        return new JsonResponse([
            'message' => 'Личните сметки са преизчислени успешно.',
            'monthly_schedule' => $data->getId(),
            'processed_accounts' => $count,
        ]);
    }
}
