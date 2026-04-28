<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;

/**
 * Разпределител на блокове към смени (порт от python_shift_generator/shift_scheduler.py).
 *
 * Присвоява блокове за управление (DrivingBlock) към смени (GeneratedShift)
 * чрез 6-фазен „greedy" (алчен) алгоритъм. Всички прагове и лимити идват
 * от GenerationParameters (динамични, зададени от потребителя).
 *
 * Фази на алгоритъма:
 *   Фаза 0: Комбинирани нощни смени, преминаващи полунощ чрез алгоритмично сутрешно продължение
 *   Фаза 1: Класификация на оставащите блокове като сутрешни / дневни / нощни кандидати
 *   Фаза 2: Изграждане на сутрешни смени (точен брой, ако е зададен)
 *   Фаза 3: Изграждане на нощни смени (точен брой, ако е зададен)
 *   Фаза 4: Изграждане на дневни смени от оставащите блокове (точен брой, ако е зададен)
 *   Фаза 5: Обхващане — остатъчни блокове: А) добавяне към съществуващи смени,
 *            Б) нови смени с тип, съобразен с целевите бройки
 *
 * Междувлаков преход (cross-train handoff):
 *   Машинист може да слезе от един влак и да се качи на друг без прекъсване
 *   на управлението (с едно качване кара два влака). Интервалът между слизане
 *   и качване трябва да е ≤ cross_train_handoff_minutes. Управлението е
 *   непрекъснато (не е почивка) — общата верига трябва да е ≤ max_drive.
 */
final class ShiftAssigner
{
    /**
     * Маршрути, които са изключени от нощния пул (вечерни сегменти,
     * които завършват прекалено рано за нощна смяна).
     */
    private const EXCLUDED_FROM_NIGHT = ['101-evening', '102-evening'];

    /** @var DrivingBlock[] Блокове, които не са могли да бъдат присвоени на никоя смяна */
    private array $unassignedBlocks = [];

    /** @var string[] Съобщения с обратна връзка за проблеми при разпределянето */
    private array $feedback = [];

    public function __construct(
        private readonly SolverClient $solverClient,
    ) {
    }

    /**
     * Връща масив от блокове, които не са присвоени към никоя смяна.
     *
     * @return DrivingBlock[]
     */
    public function getUnassignedBlocks(): array
    {
        return $this->unassignedBlocks;
    }

    /**
     * Връща масив от текстови съобщения за проблеми и предупреждения
     * при разпределянето (напр. недостатъчни блокове, кратки смени).
     *
     * @return string[]
     */
    public function getFeedback(): array
    {
        return $this->feedback;
    }

    /**
     * Основен метод: разпределя блоковете за управление към смени.
     *
     * Преминава последователно през 5-те фази на алгоритъма, след което
     * генерира обратна връзка за неприсвоени блокове, кратки смени и
     * несъответствия с целевия брой.
     *
     * @param DrivingBlock[]       $allBlocks Всички блокове за управление (от BlockGenerator)
     * @param GenerationParameters $params    Параметри на генерирането
     * @return GeneratedShift[]               Масив от генерирани смени
     */
    public function assign(array $allBlocks, GenerationParameters $params): array
    {
        $this->unassignedBlocks = [];
        $this->feedback = [];

        // Отделяме броя на генерираните смени от поредността на номерата,
        // защото нощните смени могат да получат предпочитан номер по станция.
        $morningCount = 0;
        $dayCount = 0;
        $nightCount = 0;
        $morningCounter = 0;
        $dayCounter = 0;
        $nightCounter = 0;
        $usedShiftNumbers = [
            GeneratedShift::TYPE_MORNING => [],
            GeneratedShift::TYPE_DAY => [],
            GeneratedShift::TYPE_NIGHT => [],
        ];

        /**
         * Помощна функция: създава нова смяна с автоматично генериран код.
         * Форматът е: СМ{номер}-{тип}, напр. „СМ1-С" (1-ва сутрешна), „СМ3-Д" (3-та дневна).
         */
        $allocateShiftNumber = function (string $type, ?int $preferredNumber = null) use (&$morningCount, &$dayCount, &$nightCount, &$morningCounter, &$dayCounter, &$nightCounter, &$usedShiftNumbers): int {
            if ($preferredNumber !== null
                && $preferredNumber > 0
                && !isset($usedShiftNumbers[$type][$preferredNumber])) {
                $usedShiftNumbers[$type][$preferredNumber] = true;

                if ($type === GeneratedShift::TYPE_MORNING) {
                    $morningCount++;
                } elseif ($type === GeneratedShift::TYPE_DAY) {
                    $dayCount++;
                } else {
                    $nightCount++;
                }

                return $preferredNumber;
            }

            if ($type === GeneratedShift::TYPE_MORNING) {
                do {
                    $morningCounter++;
                } while (isset($usedShiftNumbers[$type][$morningCounter]));

                $usedShiftNumbers[$type][$morningCounter] = true;
                $morningCount++;

                return $morningCounter;
            }

            if ($type === GeneratedShift::TYPE_DAY) {
                do {
                    $dayCounter++;
                } while (isset($usedShiftNumbers[$type][$dayCounter]));

                $usedShiftNumbers[$type][$dayCounter] = true;
                $dayCount++;

                return $dayCounter;
            }

            do {
                $nightCounter++;
            } while (isset($usedShiftNumbers[$type][$nightCounter]));

            $usedShiftNumbers[$type][$nightCounter] = true;
            $nightCount++;

            return $nightCounter;
        };

        $newShift = function (string $type, ?int $preferredNumber = null) use ($allocateShiftNumber): GeneratedShift {
            $shiftNumber = $allocateShiftNumber($type, $preferredNumber);

            return match ($type) {
                GeneratedShift::TYPE_MORNING => new GeneratedShift(
                    'СМ' . $shiftNumber . '-' . GeneratedShift::TYPE_MORNING,
                    GeneratedShift::TYPE_MORNING,
                ),
                GeneratedShift::TYPE_DAY => new GeneratedShift(
                    'СМ' . $shiftNumber . '-' . GeneratedShift::TYPE_DAY,
                    GeneratedShift::TYPE_DAY,
                ),
                default => new GeneratedShift(
                    'СМ' . $shiftNumber . '-' . GeneratedShift::TYPE_NIGHT,
                    GeneratedShift::TYPE_NIGHT,
                ),
            };
        };

        /**
         * Речник на неприсвоените блокове, индексиран по spl_object_id
         * за бързо премахване при присвояване.
         * @var DrivingBlock[] $unassigned
         */
        $unassigned = [];
        foreach ($allBlocks as $block) {
            $unassigned[spl_object_id($block)] = $block;
        }

        /** @var GeneratedShift[] Резултатен масив с всички генерирани смени */
        $shifts = [];

        /** Помощна функция: премахва блок от речника на неприсвоените */
        $popBlock = function (DrivingBlock $b) use (&$unassigned): void {
            unset($unassigned[spl_object_id($b)]);
        };

        /** Връща всички блокове от отхвърлена смяна обратно в неприсвоените */
        $restoreShiftBlocks = function (GeneratedShift $shift) use (&$unassigned): void {
            foreach ($shift->entries as $entry) {
                $block = $entry->block;
                $unassigned[spl_object_id($block)] = $block;
            }
        };

        /** Освобождава номера и брояча на вече създадена, но отхвърлена смяна */
        $releaseShiftAllocation = function (GeneratedShift $shift) use (&$morningCount, &$dayCount, &$nightCount, &$usedShiftNumbers): void {
            if (preg_match('/(\d+)/', $shift->shiftId, $matches) !== 1) {
                return;
            }

            $shiftNumber = (int) $matches[1];
            unset($usedShiftNumbers[$shift->shiftType][$shiftNumber]);

            if ($shift->shiftType === GeneratedShift::TYPE_MORNING) {
                $morningCount = max(0, $morningCount - 1);
                return;
            }

            if ($shift->shiftType === GeneratedShift::TYPE_DAY) {
                $dayCount = max(0, $dayCount - 1);
                return;
            }

            $nightCount = max(0, $nightCount - 1);
        };

        /** Пълно отхвърляне на временна смяна: връща блоковете и освобождава allocation */
        $discardShift = function (GeneratedShift $shift) use ($restoreShiftBlocks, $releaseShiftAllocation): void {
            $restoreShiftBlocks($shift);
            $releaseShiftAllocation($shift);
        };

        /** Добавя предупреждение само веднъж за конкретен ключ */
        $feedbackWarnings = [];
        $warnOnce = function (string $key, string $message) use (&$feedbackWarnings): void {
            if (isset($feedbackWarnings[$key])) {
                return;
            }

            $feedbackWarnings[$key] = true;
            $this->feedback[] = $message;
        };

        /** Помощна функция: намира последния (по blockIndex) неприсвоен блок за даден маршрут */
        $lastBlockOf = function (string $routeId) use (&$unassigned): ?DrivingBlock {
            $best = null;
            foreach ($unassigned as $b) {
                if ($b->routeId === $routeId && ($best === null || $b->blockIndex > $best->blockIndex)) {
                    $best = $b;
                }
            }

            return $best;
        };

        /** Помощна функция: намира първия (по blockIndex) неприсвоен блок за даден маршрут */
        $firstBlockOf = function (string $routeId) use (&$unassigned): ?DrivingBlock {
            $best = null;
            foreach ($unassigned as $b) {
                if ($b->routeId === $routeId && ($best === null || $b->blockIndex < $best->blockIndex)) {
                    $best = $b;
                }
            }

            return $best;
        };

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 0: Комбинирани нощни смени, преминаващи полунощ ──────
        // ══════════════════════════════════════════════════════════════════
        // Намира последния блок на маршрут, който завършва след 23:00 на станция,
        // различна от Depo. След това търси първия влак на следващата сутрин,
        // който потегля от същата базова станция, без значение от номера на влака.
        $extractStationShiftNumber = static function (string $station): ?int {
            $baseStation = GenerationParameters::stationBase($station);
            if ($baseStation === 'Depo') {
                return null;
            }

            if (preg_match('/(\d+)/', $baseStation, $matches) !== 1) {
                return null;
            }

            return (int) $matches[1];
        };

        $firstMorningBlockFromStation = function (DrivingBlock $nightBlock) use (&$unassigned, $params): ?DrivingBlock {
            $targetBaseStation = GenerationParameters::stationBase($nightBlock->alightStation);
            if ($targetBaseStation === 'Depo') {
                return null;
            }

            $best = null;
            foreach ($unassigned as $candidate) {
                if ($candidate->boardTime >= $params->morningThresholdSeconds) {
                    continue;
                }

                if (GenerationParameters::stationBase($candidate->boardStation) !== $targetBaseStation) {
                    continue;
                }

                if ($best === null || $candidate->boardTime < $best->boardTime) {
                    $best = $candidate;
                    continue;
                }

                if ($best !== null
                    && $candidate->boardTime === $best->boardTime
                    && $candidate->boardStation === $nightBlock->alightStation
                    && $best->boardStation !== $nightBlock->alightStation) {
                    $best = $candidate;
                }
            }

            return $best;
        };

        $nightRouteEnds = array_values($unassigned);
        usort($nightRouteEnds, fn(DrivingBlock $a, DrivingBlock $b) => $a->alightTime <=> $b->alightTime);

        foreach ($nightRouteEnds as $lastA) {
            if (!isset($unassigned[spl_object_id($lastA)])) {
                continue;
            }

            $routeLastBlock = $lastBlockOf($lastA->routeId);
            if ($routeLastBlock === null || spl_object_id($routeLastBlock) !== spl_object_id($lastA)) {
                continue;
            }

            if ($lastA->alightTime <= 23 * 3600) {
                continue;
            }

            if (GenerationParameters::stationBase($lastA->alightStation) === 'Depo') {
                continue;
            }

            $firstB = $firstMorningBlockFromStation($lastA);
            if ($firstB === null) {
                continue;
            }

            // Създаваме копие на втория блок с коригирани времена (+24 часа)
            $adjustedB = new DrivingBlock(
                routeId: $firstB->routeId,
                train: $firstB->train,
                blockIndex: $firstB->blockIndex,
                boardStation: $firstB->boardStation,
                boardTime: $firstB->boardTime + 86400,
                alightStation: $firstB->alightStation,
                alightTime: $firstB->alightTime + 86400,
                routeStartStation: $firstB->routeStartStation,
                routeEndStation: $firstB->routeEndStation,
            );

            // Проверяваме дали почивката между двата блока е достатъчна
            // и общата продължителност не надхвърля максимума за нощна смяна
            $rest = $adjustedB->boardTime - $lastA->alightTime;
            $total = $adjustedB->alightTime - $lastA->boardTime;
            if ($rest >= $params->minRestSeconds() && $total <= $params->maxNightSeconds()) {
                $preferredShiftNumber = $extractStationShiftNumber($lastA->alightStation);
                $s = $newShift(GeneratedShift::TYPE_NIGHT, $preferredShiftNumber);
                $s->addBlock($lastA);
                $s->addBlock($adjustedB);
                $popBlock($lastA);
                $popBlock($firstB);
                $shifts[] = $s;
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ── OR-Tools solver опит (преди greedy фазите) ────────────────
        // ══════════════════════════════════════════════════════════════════
        // Ако солвърът е достъпен, изпращаме всички блокове и параметри.
        // Phase 0 смените вече са генерирани — предаваме индексите им,
        // за да ги изключи солвърът. Ако солвърът успее, прескачаме greedy.
        $solverResult = $this->trySolverAssignment($allBlocks, $params, $shifts, $unassigned);
        if ($solverResult !== null) {
            return $solverResult;
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 1: Функции за класификация на блокове ────────────────
        // ══════════════════════════════════════════════════════════════════

        /**
         * Дали блокът е кандидат за сутрешна смяна.
         * Условие: времето на качване е преди сутрешния праг (morning_threshold).
         */
        $isMorningCandidate = function (DrivingBlock $b) use ($params): bool {
            return $b->boardTime < $params->morningThresholdSeconds;
        };

        /**
         * Дали блокът е кандидат за нощна смяна.
         * Условия:
         *  - Маршрутът не е в списъка с изключени (вечерни сегменти на 101/102)
         *  - Времето на качване е след нощния праг (night_threshold)
         */
        $isNightCandidate = function (DrivingBlock $b) use ($params): bool {
            if (\in_array($b->routeId, self::EXCLUDED_FROM_NIGHT, true)) {
                return false;
            }

            return $b->boardTime >= $params->nightThresholdSeconds;
        };

        /**
         * Определя естествения тип смяна за блок според часа на качване.
         */
        $naturalShiftTypeForBlock = function (DrivingBlock $block) use ($params): string {
            if ($block->boardTime < $params->morningThresholdSeconds) {
                return GeneratedShift::TYPE_MORNING;
            }

            if ($block->boardTime < $params->nightThresholdSeconds) {
                return GeneratedShift::TYPE_DAY;
            }

            return GeneratedShift::TYPE_NIGHT;
        };

        /**
         * Помощна функция: разширява смяна алчно с допълнителни съвместими блокове.
         *
         * На всяка итерация:
         *  1. Взема последния блок в смяната
         *  2. Филтрира неприсвоените блокове: трябва да започват след края на
         *     последния, смяната да може да ги приеме (canAddBlock), и да минат
         *     опционалния filter
         *  3. Сортира кандидатите по време на качване (най-ранният първи)
         *  4. Избира първия кандидат, добавя го и повтаря
         *  5. Спира, когато няма повече кандидати
         */
        $extendShift = function (GeneratedShift $s, array &$unassigned, GenerationParameters $params, ?callable $filter = null, ?callable $onChosen = null) use ($popBlock): void {
            while (true) {
                $last = $s->lastBlock();
                if ($last === null) {
                    break;
                }
                $candidates = array_values(array_filter(
                    $unassigned,
                    fn(DrivingBlock $b) =>
                        $b->boardTime >= $last->alightTime
                        && $s->canAddBlock($b, $params)
                        && ($filter === null || $filter($b))
                ));
                usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

                if (empty($candidates)) {
                    break;
                }

                $chosen = $candidates[0];
                $s->addBlock($chosen);
                if ($onChosen !== null) {
                    $onChosen($chosen);
                }
                $popBlock($chosen);
            }
        };

        /**
         * Проверява дали смяната може да достигне минимална продължителност,
         * ако я разширяваме алчно със същите правила, но без да променяме реалния пул.
         */
        $canReachMinimumDuration = function (GeneratedShift $sourceShift, array $pool, GenerationParameters $params, int $minimumSeconds, ?callable $filter = null): bool {
            if ($sourceShift->totalDuration() >= $minimumSeconds) {
                return true;
            }

            $probe = new GeneratedShift('__probe__', $sourceShift->shiftType);
            foreach ($sourceShift->entries as $entry) {
                $probe->addBlock($entry->block);
            }

            while ($probe->totalDuration() < $minimumSeconds) {
                $last = $probe->lastBlock();
                if ($last === null) {
                    return false;
                }

                $candidates = array_values(array_filter(
                    $pool,
                    fn(DrivingBlock $b) =>
                        $b->boardTime >= $last->alightTime
                        && $probe->canAddBlock($b, $params)
                        && ($filter === null || $filter($b))
                ));

                usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);
                if (empty($candidates)) {
                    return false;
                }

                $chosen = $candidates[0];
                $probe->addBlock($chosen);
                unset($pool[spl_object_id($chosen)]);
            }

            return true;
        };

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 2: Сутрешни смени ───────────────────────────────────
        // ══════════════════════════════════════════════════════════════════
        // Събира всички блокове, класифицирани като сутрешни кандидати,
        // сортира ги по време на качване и за всеки създава нова сутрешна
        // смяна, след което я разширява алчно с допълнителни блокове.

        $morningPool = array_values(array_filter($unassigned, $isMorningCandidate));
        usort($morningPool, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

        /** @var array<string, true> Вече обработени сутрешни блокове (по ключ route:index) */
        $processedMorningKeys = [];
        $targetMorning = $params->targetMorningShifts;

        foreach ($morningPool as $mb) {
            // Ако е зададен целеви брой и вече сме го достигнали — спираме
            if ($targetMorning > 0 && $morningCount >= $targetMorning) {
                break;
            }

            // Пропускаме вече обработени или междувременно присвоени блокове
            $key = $mb->routeId . ':' . $mb->blockIndex;
            if (isset($processedMorningKeys[$key]) || !isset($unassigned[spl_object_id($mb)])) {
                continue;
            }

            // Създаваме нова сутрешна смяна с началния блок
            // Пропускаме блок, ако надхвърля часовата граница за сутрешна смяна
            if ($mb->alightTime > $params->morningEndTimeSeconds) {
                continue;
            }

            $s = $newShift(GeneratedShift::TYPE_MORNING);
            $s->addBlock($mb);
            $processedMorningKeys[$key] = true;
            $popBlock($mb);

            if (!$canReachMinimumDuration($s, $unassigned, $params, $params->minMorningSeconds())) {
                $discardShift($s);
                $warnOnce(
                    'unreachable-morning-phase2',
                    sprintf(
                        'Част от ранните блокове не могат да достигнат минимум %d:%02d за сутрешна смяна и се оставят за други типове смени.',
                        intdiv($params->minMorningMinutes, 60),
                        $params->minMorningMinutes % 60,
                    )
                );
                continue;
            }

            // Разширяваме алчно с допълнителни блокове (вкл. кръстосани влакове)
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use (&$processedMorningKeys) {
                $k = $b->routeId . ':' . $b->blockIndex;
                return !isset($processedMorningKeys[$k]);
            }, function (DrivingBlock $b) use (&$processedMorningKeys): void {
                $processedMorningKeys[$b->routeId . ':' . $b->blockIndex] = true;
            });

            if ($s->totalDuration() < $params->minMorningSeconds()) {
                $discardShift($s);
                $warnOnce(
                    'short-morning-phase2',
                    sprintf(
                        'Не може да се изгради валидна сутрешна смяна >= %d:%02d в рамките на текущите ограничения. Къси сутрешни смени не се допускат.',
                        intdiv($params->minMorningMinutes, 60),
                        $params->minMorningMinutes % 60,
                    )
                );
                continue;
            }

            $shifts[] = $s;
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 3: Нощни смени ──────────────────────────────────────
        // ══════════════════════════════════════════════════════════════════
        // Аналогична на Фаза 2, но за нощни кандидати. Филтрира само блокове
        // след нощния праг и изключва вечерните сегменти на 101/102.

        $nightPool = array_values(array_filter($unassigned, $isNightCandidate));
        usort($nightPool, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

        /** @var array<string, true> Вече обработени нощни блокове */
        $processedNightKeys = [];
        $targetNight = $params->targetNightShifts;

        foreach ($nightPool as $nb) {
            // Ако е зададен целеви брой и вече сме го достигнали — спираме
            if ($targetNight > 0 && $nightCount >= $targetNight) {
                break;
            }

            // Пропускаме вече обработени или междувременно присвоени блокове
            $key = $nb->routeId . ':' . $nb->blockIndex;
            if (isset($processedNightKeys[$key]) || !isset($unassigned[spl_object_id($nb)])) {
                continue;
            }

            // Създаваме нова нощна смяна с началния блок
            $s = $newShift(GeneratedShift::TYPE_NIGHT);
            $s->addBlock($nb);
            $processedNightKeys[$key] = true;
            $popBlock($nb);

            if (!$canReachMinimumDuration($s, $unassigned, $params, $params->minNightSeconds(), $isNightCandidate)) {
                $discardShift($s);
                $warnOnce(
                    'unreachable-night-phase3',
                    sprintf(
                        'Част от късните блокове не могат да достигнат минимум %d:%02d за нощна смяна и се оставят за други типове смени.',
                        intdiv($params->minNightMinutes, 60),
                        $params->minNightMinutes % 60,
                    )
                );
                continue;
            }

            // Разширяваме алчно само с допълнителни нощни блокове
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use ($isNightCandidate, &$processedNightKeys) {
                if (!$isNightCandidate($b)) {
                    return false;
                }
                $k = $b->routeId . ':' . $b->blockIndex;
                return !isset($processedNightKeys[$k]);
            }, function (DrivingBlock $b) use (&$processedNightKeys): void {
                $processedNightKeys[$b->routeId . ':' . $b->blockIndex] = true;
            });

            if ($s->totalDuration() < $params->minNightSeconds()) {
                $discardShift($s);
                $warnOnce(
                    'short-night-phase3',
                    sprintf(
                        'Не може да се изгради валидна нощна смяна >= %d:%02d в рамките на текущите ограничения. Къси нощни смени не се допускат.',
                        intdiv($params->minNightMinutes, 60),
                        $params->minNightMinutes % 60,
                    )
                );
                continue;
            }

            $shifts[] = $s;
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 4: Дневни смени (всички оставащи блокове) ───────────
        // ══════════════════════════════════════════════════════════════════
        // Всички блокове, които не са присвоени от предишните фази, отиват
        // в дневни смени. Разширяването спира при достигане на day_target_minutes
        // или когато трябва да се запазят блокове за оставащите смени.

        $targetDay = $params->targetDayShifts;
        $rejectedDaySeedKeys = [];

        while (!empty($unassigned)) {
            // Ако е зададен целеви брой и вече сме го достигнали — спираме
            if ($targetDay > 0 && $dayCount >= $targetDay) {
                break;
            }

            // Сортираме оставащите блокове по време, после по маршрут
            $daySorted = array_values($unassigned);
            usort($daySorted, fn(DrivingBlock $a, DrivingBlock $b) =>
                $a->boardTime <=> $b->boardTime ?: strcmp($a->routeId, $b->routeId)
            );

            // Намираме първи блок, който се вписва в часовите граници на дневна смяна
            $first = null;
            foreach ($daySorted as $candidate) {
                $candidateKey = $candidate->routeId . ':' . $candidate->blockIndex;
                if (isset($rejectedDaySeedKeys[$candidateKey])) {
                    continue;
                }

                if ($candidate->boardTime >= $params->dayStartTimeSeconds
                    && $candidate->alightTime <= $params->dayEndTimeSeconds) {
                    $first = $candidate;
                    break;
                }
            }

            // Ако няма подходящ блок — спираме; остатъкът става неприсвоен
            if ($first === null) {
                break;
            }

            // Създаваме нова дневна смяна с подходящия блок
            $s = $newShift(GeneratedShift::TYPE_DAY);
            $s->addBlock($first);
            $popBlock($first);

            // Разширяваме алчно с допълнителна логика за спиране:
            //  - Спира при достигане на day_target_minutes
            //  - Спира ако трябва да се запазят блокове за други дневни смени
            while (true) {
                $last = $s->lastBlock();
                if ($last === null) {
                    break;
                }
                $earliestNext = $last->alightTime;
                $candidates = array_values(array_filter(
                    $unassigned,
                    fn(DrivingBlock $b) =>
                        $b->boardTime >= $earliestNext
                        && $s->canAddBlock($b, $params)
                ));
                usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) =>
                    $a->boardTime <=> $b->boardTime ?: strcmp($a->routeId, $b->routeId)
                );

                if (empty($candidates)) {
                    break;
                }

                // Ако е зададен целеви брой дневни смени и текущата смяна
                // вече е над минималната продължителност — запазваме блокове
                // за оставащите смени (за да не изядем всичко в една смяна)
                if ($targetDay > 0 && $s->totalDuration() >= $params->minDaySeconds()) {
                    $remainingShiftsNeeded = $targetDay - $dayCount;
                    if ($remainingShiftsNeeded > 1 && \count($unassigned) <= $remainingShiftsNeeded * 2) {
                        break;
                    }
                }

                $chosen = $candidates[0];
                $s->addBlock($chosen);
                $popBlock($chosen);

                // Спираме разширяването при достигане на целевата продължителност
                if ($s->totalDuration() >= $params->dayTargetSeconds()) {
                    break;
                }
            }

            if ($s->totalDuration() < $params->minDaySeconds()) {
                $discardShift($s);
                $rejectedDaySeedKeys[$first->routeId . ':' . $first->blockIndex] = true;
                $warnOnce(
                    'short-day-phase4',
                    sprintf(
                        'Не може да се изгради валидна дневна смяна >= %d:%02d в рамките на текущите ограничения. Увеличете броя на смените или коригирайте параметрите.',
                        intdiv($params->minDayMinutes, 60),
                        $params->minDayMinutes % 60,
                    )
                );
                continue;
            }

            $shifts[] = $s;
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 5: Обхващане на остатъчни блокове (sweep) ───────────
        // ══════════════════════════════════════════════════════════════════
        // Всички блокове, непокрити от предишните фази, се присвояват тук.
        //
        // Стъпка А: Опит за добавяне към съществуващи смени (предпочитан —
        // така се спазват зададените целеви бройки по-добре).
        //
        // Стъпка Б: Ако блокът не пасва в никоя съществуваща смяна, създава
        // се нова. Типът се определя от времето на качване.
        if (!empty($unassigned)) {
            // ── Стъпка А: добавяне към съществуващи смени ──
            $sweepSorted = array_values($unassigned);
            usort($sweepSorted, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

            foreach ($sweepSorted as $sb) {
                if (!isset($unassigned[spl_object_id($sb)])) {
                    continue;
                }

                // Опитваме всяка съществуваща смяна — предпочитаме тази, чийто
                // край е най-близък до началото на блока (минимален gap).
                $bestShift = null;
                $bestGap = PHP_INT_MAX;
                foreach ($shifts as $existingShift) {
                    if ($existingShift->canAddBlock($sb, $params)) {
                        $g = $sb->boardTime - $existingShift->endTime();
                        if ($g < $bestGap) {
                            $bestGap = $g;
                            $bestShift = $existingShift;
                        }
                    }
                }

                if ($bestShift !== null) {
                    $bestShift->addBlock($sb);
                    $popBlock($sb);
                }
            }

            // ── Стъпка Б: нови смени за наистина неприсвоимите блокове ──
            if (!empty($unassigned)) {
                $sweepSorted = array_values($unassigned);
                usort($sweepSorted, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

                foreach ($sweepSorted as $sb) {
                    if (!isset($unassigned[spl_object_id($sb)])) {
                        continue;
                    }

                    // Определяне на тип — съобразяване с целевите бройки.
                    // Ако целта за естествения тип е вече достигната, избираме
                    // дневна смяна като универсален резервен тип.
                    $naturalType = $naturalShiftTypeForBlock($sb);

                    // Проверяваме дали целта е зададена И достигната
                    $typeTargets = [
                        GeneratedShift::TYPE_MORNING => [$params->targetMorningShifts, $morningCount],
                        GeneratedShift::TYPE_DAY     => [$params->targetDayShifts, $dayCount],
                        GeneratedShift::TYPE_NIGHT   => [$params->targetNightShifts, $nightCount],
                    ];

                    $sweepType = $naturalType;
                    [$target, $current] = $typeTargets[$naturalType];
                    if ($target > 0 && $current >= $target) {
                        // Целта е достигната — търсим алтернативен тип с място
                        $fallbackOrder = [GeneratedShift::TYPE_DAY, GeneratedShift::TYPE_NIGHT, GeneratedShift::TYPE_MORNING];
                        foreach ($fallbackOrder as $alt) {
                            if ($alt === $naturalType) {
                                continue;
                            }
                            [$altTarget, $altCurrent] = $typeTargets[$alt];
                            if ($altTarget === 0 || $altCurrent < $altTarget) {
                                $sweepType = $alt;
                                break;
                            }
                        }
                    }

                    [$resolvedTarget, $resolvedCurrent] = $typeTargets[$sweepType];
                    if ($resolvedTarget > 0 && $resolvedCurrent >= $resolvedTarget) {
                        $typeLabel = match ($naturalType) {
                            GeneratedShift::TYPE_MORNING => 'сутрешни',
                            GeneratedShift::TYPE_DAY => 'дневни',
                            default => 'нощни',
                        };
                        $warnOnce(
                            'target-limit-' . $naturalType,
                            sprintf(
                                'Достигнат е зададеният лимит за %s смени и остават непокрити блокове. Необходимо е операторът да увеличи броя на смените.',
                                $typeLabel,
                            )
                        );
                        continue;
                    }

                    $s = $newShift($sweepType);
                    $s->addBlock($sb);
                    $popBlock($sb);

                    if ($s->shiftType === GeneratedShift::TYPE_MORNING
                        && !$canReachMinimumDuration($s, $unassigned, $params, $params->minMorningSeconds())) {
                        $discardShift($s);
                        $warnOnce(
                            'unreachable-morning-phase5',
                            sprintf(
                                'Остават блокове, които не могат да формират валидна сутрешна смяна >= %d:%02d. Нужно е преразпределение към дневни смени или промяна на параметрите.',
                                intdiv($params->minMorningMinutes, 60),
                                $params->minMorningMinutes % 60,
                            )
                        );
                        continue;
                    }

                    if ($s->shiftType === GeneratedShift::TYPE_NIGHT
                        && !$canReachMinimumDuration($s, $unassigned, $params, $params->minNightSeconds())) {
                        $discardShift($s);
                        $warnOnce(
                            'unreachable-night-phase5',
                            sprintf(
                                'Остават блокове, които не могат да формират валидна нощна смяна >= %d:%02d. Нужно е преразпределение към други смени или промяна на параметрите.',
                                intdiv($params->minNightMinutes, 60),
                                $params->minNightMinutes % 60,
                            )
                        );
                        continue;
                    }

                    // Разширяваме алчно без тип-филтър
                    while (true) {
                        $last = $s->lastBlock();
                        if ($last === null) {
                            break;
                        }
                        $candidates = [];
                        foreach ($unassigned as $ub) {
                            if ($ub->boardTime >= $last->alightTime
                                && $s->canAddBlock($ub, $params)) {
                                $candidates[] = $ub;
                            }
                        }
                        usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);
                        if (empty($candidates)) {
                            break;
                        }
                        $s->addBlock($candidates[0]);
                        $popBlock($candidates[0]);
                    }

                    if ($s->shiftType === GeneratedShift::TYPE_DAY && $s->totalDuration() < $params->minDaySeconds()) {
                        $discardShift($s);
                        $warnOnce(
                            'short-day-phase5',
                            sprintf(
                                'Остават блокове, които изискват кратка дневна смяна под %d:%02d. Генерирането спира и е нужно операторът да увеличи броя на смените.',
                                intdiv($params->minDayMinutes, 60),
                                $params->minDayMinutes % 60,
                            )
                        );
                        continue;
                    }

                    if ($s->shiftType === GeneratedShift::TYPE_MORNING && $s->totalDuration() < $params->minMorningSeconds()) {
                        $discardShift($s);
                        $warnOnce(
                            'short-morning-phase5',
                            sprintf(
                                'Остават блокове, които изискват кратка сутрешна смяна под %d:%02d. Генерирането спира и е нужно операторът да увеличи броя на смените или да промени параметрите.',
                                intdiv($params->minMorningMinutes, 60),
                                $params->minMorningMinutes % 60,
                            )
                        );
                        continue;
                    }

                    if ($s->shiftType === GeneratedShift::TYPE_NIGHT && $s->totalDuration() < $params->minNightSeconds()) {
                        $discardShift($s);
                        $warnOnce(
                            'short-night-phase5',
                            sprintf(
                                'Остават блокове, които изискват кратка нощна смяна под %d:%02d. Генерирането спира и е нужно операторът да увеличи броя на смените или да промени параметрите.',
                                intdiv($params->minNightMinutes, 60),
                                $params->minNightMinutes % 60,
                            )
                        );
                        continue;
                    }

                    $shifts[] = $s;
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 6: Пренареждане за максимално покритие ─────────────
        // ══════════════════════════════════════════════════════════════════
        // Ако след Фази 0–5 има непокрити блокове, тази фаза създава
        // допълнителни смени БЕЗ ограничение за минимална продължителност
        // и целеви бройки. Целта е максимално покритие на графика.
        if (!empty($unassigned)) {
            $forceBlocks = array_values($unassigned);
            usort($forceBlocks, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);

            foreach ($forceBlocks as $fb) {
                if (!isset($unassigned[spl_object_id($fb)])) {
                    continue;
                }

                // Стъпка А: Опит за добавяне към съществуваща смяна
                $bestShift = null;
                $bestGap = PHP_INT_MAX;
                foreach ($shifts as $existingShift) {
                    if ($existingShift->canAddBlock($fb, $params)) {
                        $g = $fb->boardTime - $existingShift->endTime();
                        if ($g >= 0 && $g < $bestGap) {
                            $bestGap = $g;
                            $bestShift = $existingShift;
                        }
                    }
                }

                if ($bestShift !== null) {
                    $bestShift->addBlock($fb);
                    $popBlock($fb);
                    continue;
                }

                // Стъпка Б: Нова допълнителна смяна (без ограничение за мин. продължителност)
                $type = $naturalShiftTypeForBlock($fb);
                $s = $newShift($type);
                $s->addBlock($fb);
                $popBlock($fb);

                // Разширяване алчно
                while (true) {
                    $last = $s->lastBlock();
                    if ($last === null) {
                        break;
                    }
                    $candidates = array_values(array_filter(
                        $unassigned,
                        fn(DrivingBlock $b) => $b->boardTime >= $last->alightTime && $s->canAddBlock($b, $params),
                    ));
                    usort($candidates, fn(DrivingBlock $a, DrivingBlock $b) => $a->boardTime <=> $b->boardTime);
                    if (empty($candidates)) {
                        break;
                    }
                    $s->addBlock($candidates[0]);
                    $popBlock($candidates[0]);
                }

                $shifts[] = $s;
                $this->feedback[] = sprintf(
                    '%s: допълнителна смяна за покриване на непокрит участък (продължителност %d:%02d)',
                    $s->shiftId,
                    intdiv($s->totalDuration(), 3600),
                    intdiv($s->totalDuration() % 3600, 60),
                );
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Обратна връзка: неприсвоени блокове ──────────────────────
        // ══════════════════════════════════════════════════════════════════
        // Ако са останали блокове (обикновено при зададен целеви брой смени),
        // записваме ги и генерираме предупредителни съобщения.
        if (!empty($unassigned)) {
            $this->unassignedBlocks = array_values($unassigned);
            foreach ($this->unassignedBlocks as $b) {
                $this->feedback[] = sprintf(
                    'Блок маршрут %s (влак %d), %s→%s [%s-%s] не е присвоен — няма съвместима смяна в рамките на зададения брой',
                    $b->routeId, $b->train, $b->boardStation, $b->alightStation,
                    $b->boardTimeStr(), $b->alightTimeStr(),
                );
            }

            $unassignedByType = [
                GeneratedShift::TYPE_MORNING => 0,
                GeneratedShift::TYPE_DAY => 0,
                GeneratedShift::TYPE_NIGHT => 0,
            ];

            foreach ($this->unassignedBlocks as $block) {
                $unassignedByType[$naturalShiftTypeForBlock($block)]++;
            }

            if ($unassignedByType[GeneratedShift::TYPE_MORNING] > 0) {
                $this->feedback[] = sprintf(
                    'Остават %d непокрити блока за сутрешни смени. Операторът трябва да увеличи броя на сутрешните смени или да промени параметрите.',
                    $unassignedByType[GeneratedShift::TYPE_MORNING],
                );
            }

            if ($unassignedByType[GeneratedShift::TYPE_DAY] > 0) {
                $this->feedback[] = sprintf(
                    'Остават %d непокрити блока за дневни смени. Операторът трябва да увеличи броя на дневните смени, защото къси дневни смени не се допускат.',
                    $unassignedByType[GeneratedShift::TYPE_DAY],
                );
            }

            if ($unassignedByType[GeneratedShift::TYPE_NIGHT] > 0) {
                $this->feedback[] = sprintf(
                    'Остават %d непокрити блока за нощни смени. Операторът трябва да увеличи броя на нощните смени или да промени параметрите.',
                    $unassignedByType[GeneratedShift::TYPE_NIGHT],
                );
            }
        }

        // ── Обратна връзка: твърде кратки смени ──
        // Проверяваме дали някоя смяна е под минималната продължителност за типа си
        foreach ($shifts as $s) {
            $dur = $s->totalDuration();
            $minDur = match ($s->shiftType) {
                GeneratedShift::TYPE_MORNING => $params->minMorningSeconds(),
                GeneratedShift::TYPE_DAY => $params->minDaySeconds(),
                GeneratedShift::TYPE_NIGHT => $params->minNightSeconds(),
                default => 0,
            };
            if ($minDur > 0 && $dur < $minDur) {
                $typeLabel = match ($s->shiftType) {
                    GeneratedShift::TYPE_MORNING => 'сутрешна',
                    GeneratedShift::TYPE_DAY => 'дневна',
                    GeneratedShift::TYPE_NIGHT => 'нощна',
                    default => '',
                };
                $this->feedback[] = sprintf(
                    '%s: %s смяна е %d:%02d — под минимума %d:%02d. Препоръчва се добавяне на блокове или промяна на параметрите.',
                    $s->shiftId, $typeLabel,
                    intdiv($dur, 3600), intdiv($dur % 3600, 60),
                    intdiv($minDur, 3600), intdiv($minDur % 3600, 60),
                );
            }
        }

        // ── Обратна връзка: несъответствие с целевия брой смени ──
        if ($targetMorning > 0 && $morningCount !== $targetMorning) {
            $this->feedback[] = sprintf(
                'Зададени %d сутрешни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetMorning, $morningCount,
            );
        }
        if ($targetDay > 0 && $dayCount !== $targetDay) {
            $this->feedback[] = sprintf(
                'Зададени %d дневни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetDay, $dayCount,
            );
        }
        if ($targetNight > 0 && $nightCount !== $targetNight) {
            $this->feedback[] = sprintf(
                'Зададени %d нощни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetNight, $nightCount,
            );
        }

        // Зануляваме restAfter на последния запис във всяка смяна
        // (след последния блок няма почивка)
        foreach ($shifts as $s) {
            if (!empty($s->entries)) {
                $lastEntry = end($s->entries);
                $lastEntry->restAfter = null;
            }
        }

        // Sort shifts: morning (С) first, then day (Д), then night (Н), each group by shift code number (СМ1, СМ2, …)
        $typeOrder = [
            GeneratedShift::TYPE_MORNING => 0,
            GeneratedShift::TYPE_DAY => 1,
            GeneratedShift::TYPE_NIGHT => 2,
        ];
        usort($shifts, function (GeneratedShift $a, GeneratedShift $b) use ($typeOrder) {
            $ta = $typeOrder[$a->shiftType] ?? 9;
            $tb = $typeOrder[$b->shiftType] ?? 9;
            if ($ta !== $tb) {
                return $ta <=> $tb;
            }

            // В рамките на типа — сортираме по начално време на смяната
            return $a->startTime() <=> $b->startTime();
        });

        // ── Преномериране: последователни номера за всеки тип (СМ1, СМ2, …) ──
        $typeCounters = [
            GeneratedShift::TYPE_MORNING => 0,
            GeneratedShift::TYPE_DAY => 0,
            GeneratedShift::TYPE_NIGHT => 0,
        ];
        foreach ($shifts as $s) {
            $typeCounters[$s->shiftType]++;
            $s->shiftId = 'СМ' . $typeCounters[$s->shiftType] . '-' . $s->shiftType;
        }

        return $shifts;
    }

    /**
     * Опитва да използва OR-Tools solver за разпределяне на блокове.
     *
     * @param DrivingBlock[]       $allBlocks    Всички блокове
     * @param GenerationParameters $params       Параметри
     * @param GeneratedShift[]     $phase0Shifts Вече генерирани Phase 0 нощни смени
     * @param DrivingBlock[]       $unassigned   Оставащи неприсвоени блокове (по spl_object_id)
     *
     * @return GeneratedShift[]|null Null ако солвърът е недостъпен или неуспешен
     */
    private function trySolverAssignment(
        array $allBlocks,
        GenerationParameters $params,
        array $phase0Shifts,
        array &$unassigned,
    ): ?array {
        if (!$this->solverClient->isAvailable()) {
            $this->feedback[] = 'OR-Tools solver не е достъпен — използва се greedy алгоритъм.';

            return null;
        }

        // Построяваме map: block object → index in allBlocks
        $blockIndex = [];
        foreach ($allBlocks as $idx => $block) {
            $blockIndex[spl_object_id($block)] = $idx;
        }

        // Phase 0 block indices (grouped by shift)
        $phase0BlockIds = [];
        foreach ($phase0Shifts as $shift) {
            $group = [];
            foreach ($shift->entries as $entry) {
                // Намираме оригиналния индекс (не коригирания +86400 блок)
                foreach ($allBlocks as $idx => $block) {
                    if ($block->routeId === $entry->block->routeId
                        && $block->blockIndex === $entry->block->blockIndex
                        && $block->train === $entry->block->train) {
                        $group[] = $idx;
                        break;
                    }
                }
            }
            if (!empty($group)) {
                $phase0BlockIds[] = $group;
            }
        }

        $result = $this->solverClient->solve($allBlocks, $params, $phase0BlockIds);
        if ($result === null) {
            $this->feedback[] = 'OR-Tools solver грешка — използва се greedy алгоритъм.';

            return null;
        }

        $status = $result['status'] ?? 'unknown';
        if (\in_array($status, ['infeasible', 'timeout', 'error'], true)) {
            $this->feedback[] = sprintf(
                'OR-Tools solver: %s — използва се greedy алгоритъм.',
                $status,
            );
            foreach ($result['feedback'] ?? [] as $fb) {
                $this->feedback[] = $fb;
            }

            return null;
        }

        // Построяваме GeneratedShift[] от солвърния резултат
        $solverShifts = $this->buildShiftsFromSolver($result, $allBlocks, $params, $phase0Shifts);

        // Solver feedback
        foreach ($result['feedback'] ?? [] as $fb) {
            $this->feedback[] = $fb;
        }

        $this->feedback[] = sprintf(
            'OR-Tools solver: статус=%s, цел=%.0f, време=%dms',
            $status,
            $result['objective_value'] ?? 0,
            $result['solve_time_ms'] ?? 0,
        );

        // Обновяваме unassigned
        $assignedIndices = new \SplFixedArray(0);
        $allAssigned = [];
        foreach ($result['shifts'] ?? [] as $shiftData) {
            foreach ($shiftData['block_indices'] ?? [] as $bi) {
                $allAssigned[$bi] = true;
            }
        }
        // Phase 0 blocks
        foreach ($phase0BlockIds as $group) {
            foreach ($group as $bi) {
                $allAssigned[$bi] = true;
            }
        }

        $this->unassignedBlocks = [];
        foreach ($allBlocks as $idx => $block) {
            if (!isset($allAssigned[$idx])) {
                $this->unassignedBlocks[] = $block;
            }
        }

        if (!empty($result['unassigned_block_indices'])) {
            foreach ($result['unassigned_block_indices'] as $bi) {
                if (isset($allBlocks[$bi])) {
                    $this->feedback[] = sprintf(
                        'Блок маршрут %s (влак %d), %s→%s [%s-%s] не е присвоен от солвъра',
                        $allBlocks[$bi]->routeId, $allBlocks[$bi]->train,
                        $allBlocks[$bi]->boardStation, $allBlocks[$bi]->alightStation,
                        $allBlocks[$bi]->boardTimeStr(), $allBlocks[$bi]->alightTimeStr(),
                    );
                }
            }
        }

        return $solverShifts;
    }

    /**
     * Построява GeneratedShift[] от отговора на солвъра + Phase 0 смените.
     *
     * @param array                $result       Солвър response
     * @param DrivingBlock[]       $allBlocks
     * @param GenerationParameters $params
     * @param GeneratedShift[]     $phase0Shifts
     *
     * @return GeneratedShift[]
     */
    private function buildShiftsFromSolver(
        array $result,
        array $allBlocks,
        GenerationParameters $params,
        array $phase0Shifts,
    ): array {
        $shifts = $phase0Shifts;

        foreach ($result['shifts'] ?? [] as $shiftData) {
            $shiftType = $shiftData['shift_type'] ?? GeneratedShift::TYPE_DAY;
            // Временен ID — ще се преномерира долу
            $shift = new GeneratedShift('tmp', $shiftType);

            foreach ($shiftData['block_indices'] ?? [] as $bi) {
                if (isset($allBlocks[$bi])) {
                    $shift->addBlock($allBlocks[$bi]);
                }
            }

            if (!empty($shift->entries)) {
                $shifts[] = $shift;
            }
        }

        // Зануляваме restAfter на последния запис във всяка смяна
        foreach ($shifts as $s) {
            if (!empty($s->entries)) {
                $lastEntry = end($s->entries);
                $lastEntry->restAfter = null;
            }
        }

        // Сортираме: С → Д → Н, в рамките на типа по начално време
        $typeOrder = [
            GeneratedShift::TYPE_MORNING => 0,
            GeneratedShift::TYPE_DAY => 1,
            GeneratedShift::TYPE_NIGHT => 2,
        ];
        usort($shifts, function (GeneratedShift $a, GeneratedShift $b) use ($typeOrder) {
            $ta = $typeOrder[$a->shiftType] ?? 9;
            $tb = $typeOrder[$b->shiftType] ?? 9;
            if ($ta !== $tb) {
                return $ta <=> $tb;
            }

            return $a->startTime() <=> $b->startTime();
        });

        // Последователна номерация: СМ1-С, СМ2-С, … СМ1-Д, СМ2-Д, … СМ1-Н, …
        $typeCounters = [
            GeneratedShift::TYPE_MORNING => 0,
            GeneratedShift::TYPE_DAY => 0,
            GeneratedShift::TYPE_NIGHT => 0,
        ];
        foreach ($shifts as $s) {
            $typeCounters[$s->shiftType]++;
            $s->shiftId = 'СМ' . $typeCounters[$s->shiftType] . '-' . $s->shiftType;
        }

        return $shifts;
    }
}
