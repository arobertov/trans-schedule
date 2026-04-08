<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\GenerationResult;
use App\Entity\ShiftScheduleDetails;
use App\Entity\ShiftSchedules;
use App\Entity\TrainSchedule;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Orchestrator service that chains the full shift generation pipeline:
 *   ScheduleParser → BlockGenerator → ShiftAssigner → ShiftValidator → ShiftScheduleMapper
 *
 * Supports preview (dry-run) and persist (saves to DB) modes.
 */
final class ShiftGeneratorService
{
    public function __construct(
        private readonly ScheduleParser $parser,
        private readonly BlockGenerator $blockGenerator,
        private readonly ShiftAssigner $assigner,
        private readonly ShiftValidator $validator,
        private readonly ShiftScheduleMapper $mapper,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * Run the full generation pipeline without persisting (preview mode).
     */
    public function preview(TrainSchedule $trainSchedule, GenerationParameters $params): GenerationResult
    {
        $segments = $this->parser->parse($trainSchedule);
        $blocks = $this->blockGenerator->generateAll($segments, $params);
        $shifts = $this->assigner->assign($blocks, $params);
        $validation = $this->validator->validate($shifts, $blocks, $params);

        return new GenerationResult(
            $shifts,
            $blocks,
            $segments,
            $validation,
            $params,
            $this->assigner->getUnassignedBlocks(),
            $this->assigner->getFeedback(),
        );
    }

    /**
     * Run the full pipeline and persist results to the database.
     *
     * @return array{result: GenerationResult, schedule: ShiftSchedules}
     */
    public function generate(
        TrainSchedule $trainSchedule,
        GenerationParameters $params,
        ?string $name = null,
        ?string $description = null,
        ?int $existingScheduleId = null,
        bool $replaceExisting = false,
    ): array {
        $generationResult = $this->preview($trainSchedule, $params);

        // Resolve target schedule
        if ($existingScheduleId !== null) {
            $schedule = $this->em->find(ShiftSchedules::class, $existingScheduleId);
            if ($schedule === null) {
                throw new \InvalidArgumentException(sprintf('Графикът с ID %d не е намерен', $existingScheduleId));
            }

            if ($replaceExisting) {
                // Remove existing details
                foreach ($schedule->getDetails() as $detail) {
                    $this->em->remove($detail);
                }
                // Reset to draft status on regeneration
                $schedule->setStatus(\App\Enum\ShiftScheduleStatus::Draft);
                $this->em->flush();
            }
        } else {
            $schedule = new ShiftSchedules();
            $schedule->setName($name ?? 'Автоматично генериран график');
            if ($description !== null) {
                $schedule->setDescription($description);
            }
            $this->em->persist($schedule);
            $this->em->flush(); // so we get an ID
        }

        // Map generated shifts to ShiftScheduleDetails entities
        $details = $this->mapper->map($generationResult->shifts, $schedule, $params);

        // Persist all details in batches
        $batchSize = 50;
        foreach ($details as $i => $detail) {
            $this->em->persist($detail);
            if (($i % $batchSize) === 0) {
                $this->em->flush();
            }
        }
        $this->em->flush();

        return [
            'result' => $generationResult,
            'schedule' => $schedule,
        ];
    }
}
