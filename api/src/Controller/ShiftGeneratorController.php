<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\ShiftGenerator\GenerationParameters;
use App\Entity\ShiftSchedules;
use App\Entity\TrainSchedule;
use App\Enum\ShiftScheduleStatus;
use App\Service\ShiftGenerator\ShiftGeneratorService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class ShiftGeneratorController extends AbstractController
{
    public function __construct(
        private readonly ShiftGeneratorService $generator,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * Preview: dry-run generation — returns shifts + validation without persisting.
     */
    #[Route('/api/shift_schedules/generate/preview', name: 'shift_generate_preview', methods: ['POST'])]
    public function preview(Request $request): JsonResponse
    {
        $payload = $this->parsePayload($request);
        $trainSchedule = $this->resolveTrainSchedule($payload);
        $params = new GenerationParameters($payload);

        $result = $this->generator->preview($trainSchedule, $params);

        return $this->json([
            'status' => 'success',
            ...$result->toArray(),
        ]);
    }

    /**
     * Generate: run the pipeline and persist results as DRAFT schedule.
     */
    #[Route('/api/shift_schedules/generate', name: 'shift_generate', methods: ['POST'])]
    public function generate(Request $request): JsonResponse
    {
        $payload = $this->parsePayload($request);
        $trainSchedule = $this->resolveTrainSchedule($payload);
        $params = new GenerationParameters($payload);

        $name = $payload['name'] ?? null;
        $description = $payload['description'] ?? null;
        $existingScheduleId = isset($payload['existing_schedule_id']) ? (int) $payload['existing_schedule_id'] : null;
        $replaceExisting = (bool) ($payload['replace_existing'] ?? false);

        // Name is required for new schedules
        if ($existingScheduleId === null && empty($name)) {
            throw new BadRequestHttpException('Полето "name" е задължително при създаване на нов график');
        }

        $generated = $this->generator->generate(
            $trainSchedule,
            $params,
            $name,
            $description,
            $existingScheduleId,
            $replaceExisting,
        );

        $schedule = $generated['schedule'];
        $result = $generated['result'];

        return $this->json([
            'status' => 'success',
            'schedule_id' => $schedule->getId(),
            'schedule_iri' => '/shift_schedules/' . $schedule->getId(),
            ...$result->toArray(),
        ], Response::HTTP_CREATED);
    }

    /**
     * Approve a draft schedule: change status from 'проект' to 'активен'.
     */
    #[Route('/api/shift_schedules/{id}/approve', name: 'shift_schedule_approve', methods: ['POST'])]
    public function approve(int $id): JsonResponse
    {
        $schedule = $this->em->find(ShiftSchedules::class, $id);
        if ($schedule === null) {
            throw new NotFoundHttpException(sprintf('Графикът с ID %d не е намерен', $id));
        }

        if ($schedule->getStatus() === ShiftScheduleStatus::Active) {
            return $this->json([
                'status' => 'info',
                'message' => 'Графикът вече е активен',
            ]);
        }

        $schedule->setStatus(ShiftScheduleStatus::Active);
        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'message' => 'Графикът е одобрен и преместен към активните графици',
            'schedule_id' => $schedule->getId(),
        ]);
    }

    private function parsePayload(Request $request): array
    {
        $payload = $request->toArray();
        if (!\is_array($payload)) {
            throw new BadRequestHttpException('Невалиден JSON');
        }

        return $payload;
    }

    private function resolveTrainSchedule(array $payload): TrainSchedule
    {
        $id = $payload['train_schedule_id'] ?? null;
        if ($id === null) {
            throw new BadRequestHttpException('Полето "train_schedule_id" е задължително');
        }

        $trainSchedule = $this->em->find(TrainSchedule::class, (int) $id);
        if ($trainSchedule === null) {
            throw new NotFoundHttpException(sprintf('Разписание с ID %d не е намерено', (int) $id));
        }

        return $trainSchedule;
    }
}
