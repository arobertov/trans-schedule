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
 * чрез 5-фазен „greedy" (алчен) алгоритъм. Всички прагове и лимити идват
 * от GenerationParameters (динамични, зададени от потребителя).
 *
 * Фази на алгоритъма:
 *   Фаза 0: Комбинирани нощни смени, преминаващи полунощ (107→100, 108→101-сутрин)
 *   Фаза 1: Класификация на оставащите блокове като сутрешни / дневни / нощни кандидати
 *   Фаза 2: Изграждане на сутрешни смени (точен брой, ако е зададен)
 *   Фаза 3: Изграждане на нощни смени (точен брой, ако е зададен)
 *   Фаза 4: Изграждане на дневни смени от оставащите блокове (точен брой, ако е зададен)
 *
 * Кръстосано свързване на влакове (cross-train chaining):
 *   Блокове от различни влакове могат да се комбинират в една смяна, когато
 *   споделят една и съща базова станция (без номер на коловоз) и времевият
 *   интервал е в рамките на cross_train_handoff_minutes.
 */
final class ShiftAssigner
{
    /**
     * Хардкоднати двойки маршрути, които формират комбинирани нощни смени
     * преминаващи полунощ. Напр. последният блок на влак 107 + първият на 100.
     */
    private const COMBINED_NIGHT_ROUTES = [
        ['107', '100'],
        ['108', '101-morning'],
    ];

    /**
     * Маршрути, които са изключени от нощния пул (вечерни сегменти,
     * които завършват прекалено рано за нощна смяна).
     */
    private const EXCLUDED_FROM_NIGHT = ['101-evening', '102-evening'];

    /** @var DrivingBlock[] Блокове, които не са могли да бъдат присвоени на никоя смяна */
    private array $unassignedBlocks = [];

    /** @var string[] Съобщения с обратна връзка за проблеми при разпределянето */
    private array $feedback = [];

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

        // Броячи за всеки тип смяна — използват се за именуване (СМ1-С, СМ2-Д и т.н.)
        $morningCounter = 0;
        $dayCounter = 0;
        $nightCounter = 0;

        /**
         * Помощна функция: създава нова смяна с автоматично генериран код.
         * Форматът е: СМ{номер}-{тип}, напр. „СМ1-С" (1-ва сутрешна), „СМ3-Д" (3-та дневна).
         */
        $newShift = function (string $type) use (&$morningCounter, &$dayCounter, &$nightCounter): GeneratedShift {
            return match ($type) {
                GeneratedShift::TYPE_MORNING => new GeneratedShift(
                    'СМ' . (++$morningCounter) . '-' . GeneratedShift::TYPE_MORNING,
                    GeneratedShift::TYPE_MORNING,
                ),
                GeneratedShift::TYPE_DAY => new GeneratedShift(
                    'СМ' . (++$dayCounter) . '-' . GeneratedShift::TYPE_DAY,
                    GeneratedShift::TYPE_DAY,
                ),
                default => new GeneratedShift(
                    'СМ' . (++$nightCounter) . '-' . GeneratedShift::TYPE_NIGHT,
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
        // Свързва последния блок от вечерен маршрут (напр. 107) с първия блок
        // от сутрешен маршрут (напр. 100) на следващия ден. Времената на
        // втория блок се коригират с +24 часа (86400 сек.), за да се
        // моделира преминаването през полунощ.
        foreach (self::COMBINED_NIGHT_ROUTES as [$routeA, $routeB]) {
            $lastA = $lastBlockOf($routeA);
            $firstB = $firstBlockOf($routeB);
            if ($lastA === null || $firstB === null) {
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
                $s = $newShift(GeneratedShift::TYPE_NIGHT);
                $s->addBlock($lastA);
                $s->addBlock($adjustedB);
                $popBlock($lastA);
                $popBlock($firstB);
                $shifts[] = $s;
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 1: Функции за класификация на блокове ────────────────
        // ══════════════════════════════════════════════════════════════════

        /**
         * Дали блокът е кандидат за сутрешна смяна.
         * Условия:
         *  - Времето на качване е преди сутрешния праг (morning_threshold)
         *  - Ако блокът тръгва от депо/крайна точка — винаги е кандидат
         *  - Ако тръгва от станция за оборот (напр. ст.14) — само ако е преди
         *    ранния праг за ст.14 (morning_station14_threshold)
         */
        $isMorningCandidate = function (DrivingBlock $b) use ($params): bool {
            if ($b->boardTime >= $params->morningThresholdSeconds) {
                return false;
            }
            if (!$params->isCrewChangeStation($b->boardStation) || $b->isBoardAtRouteEndpoint()) {
                return true; // Тръгва от депо или крайна точка на маршрута
            }

            return $b->boardTime < $params->morningStation14ThresholdSeconds;
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
        $extendShift = function (GeneratedShift $s, array &$unassigned, GenerationParameters $params, ?callable $filter = null) use ($popBlock): void {
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
                $popBlock($chosen);
            }
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
            if ($targetMorning > 0 && $morningCounter >= $targetMorning) {
                break;
            }

            // Пропускаме вече обработени или междувременно присвоени блокове
            $key = $mb->routeId . ':' . $mb->blockIndex;
            if (isset($processedMorningKeys[$key]) || !isset($unassigned[spl_object_id($mb)])) {
                continue;
            }

            // Създаваме нова сутрешна смяна с началния блок
            $s = $newShift(GeneratedShift::TYPE_MORNING);
            $s->addBlock($mb);
            $processedMorningKeys[$key] = true;
            $popBlock($mb);

            // Разширяваме алчно с допълнителни блокове (вкл. кръстосани влакове)
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use (&$processedMorningKeys) {
                $k = $b->routeId . ':' . $b->blockIndex;
                if (isset($processedMorningKeys[$k])) {
                    return false;
                }
                $processedMorningKeys[$k] = true;

                return true;
            });

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
            if ($targetNight > 0 && $nightCounter >= $targetNight) {
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

            // Разширяваме алчно само с допълнителни нощни блокове
            $extendShift($s, $unassigned, $params, function (DrivingBlock $b) use ($isNightCandidate, &$processedNightKeys) {
                if (!$isNightCandidate($b)) {
                    return false;
                }
                $k = $b->routeId . ':' . $b->blockIndex;
                if (isset($processedNightKeys[$k])) {
                    return false;
                }
                $processedNightKeys[$k] = true;

                return true;
            });

            $shifts[] = $s;
        }

        // ══════════════════════════════════════════════════════════════════
        // ── Фаза 4: Дневни смени (всички оставащи блокове) ───────────
        // ══════════════════════════════════════════════════════════════════
        // Всички блокове, които не са присвоени от предишните фази, отиват
        // в дневни смени. Разширяването спира при достигане на day_target_minutes
        // или когато трябва да се запазят блокове за оставащите смени.

        $targetDay = $params->targetDayShifts;

        while (!empty($unassigned)) {
            // Ако е зададен целеви брой и вече сме го достигнали — спираме
            if ($targetDay > 0 && $dayCounter >= $targetDay) {
                break;
            }

            // Сортираме оставащите блокове по време, после по маршрут
            $daySorted = array_values($unassigned);
            usort($daySorted, fn(DrivingBlock $a, DrivingBlock $b) =>
                $a->boardTime <=> $b->boardTime ?: strcmp($a->routeId, $b->routeId)
            );

            // Създаваме нова дневна смяна с най-ранния оставащ блок
            $first = $daySorted[0];
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
                    $remainingShiftsNeeded = $targetDay - $dayCounter;
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

            $shifts[] = $s;
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
        if ($targetMorning > 0 && $morningCounter !== $targetMorning) {
            $this->feedback[] = sprintf(
                'Зададени %d сутрешни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetMorning, $morningCounter,
            );
        }
        if ($targetDay > 0 && $dayCounter !== $targetDay) {
            $this->feedback[] = sprintf(
                'Зададени %d дневни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetDay, $dayCounter,
            );
        }
        if ($targetNight > 0 && $nightCounter !== $targetNight) {
            $this->feedback[] = sprintf(
                'Зададени %d нощни смени, генерирани %d — недостатъчни блокове за целевия брой',
                $targetNight, $nightCounter,
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

        return $shifts;
    }
}
