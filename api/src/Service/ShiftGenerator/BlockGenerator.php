<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\RouteSegment;

/**
 * Генератор на блокове за управление (порт от python_shift_generator/block_generator.py).
 *
 * Разделя всеки маршрутен сегмент (RouteSegment) на блокове за непрекъснато управление
 * (DrivingBlock) чрез „greedy" (алчен) алгоритъм:
 *
 *  - От началото на всеки блок се търси най-далечната станция за оборот (crew-change)
 *    или крайна точка на маршрута, в рамките на MAX_DRIVE минути.
 *  - Блоковете винаги започват и завършват на станция за оборот или на крайна
 *    точка на маршрута (депо).
 */
final class BlockGenerator
{
    /**
     * Генерира блокове за всички подадени маршрутни сегменти.
     *
     * Обхожда всеки сегмент и извиква generateBlocks() за него,
     * след което обединява резултатите в един общ масив.
     *
     * @param RouteSegment[]       $segments Масив от маршрутни сегменти (от ScheduleParser)
     * @param GenerationParameters $params   Параметри на генерирането (max_drive, crew-change станции и др.)
     * @return DrivingBlock[]                Всички генерирани блокове за управление
     */
    public function generateAll(array $segments, GenerationParameters $params): array
    {
        $allBlocks = [];
        foreach ($segments as $segment) {
            $blocks = $this->generateBlocks($segment, $params);
            array_push($allBlocks, ...$blocks);
        }

        return $allBlocks;
    }

    /**
     * Генерира блокове за управление за един маршрутен сегмент.
     *
     * Алгоритъмът работи по следния начин:
     *  1. Тръгва от първата спирка на сегмента.
     *  2. Изчислява краен срок (deadline) = текущо време + MAX_DRIVE.
     *  3. Сканира напред по спирките и търси най-далечната станция за оборот
     *     или крайна точка (последна спирка), която е в рамките на deadline.
     *  4. Ако не намери такава — взема следващата спирка като резервен вариант.
     *  5. Предпочита край на блока на станция за оборот (crew-change), а не
     *     на произволна междинна спирка.
     *  6. Създава DrivingBlock с начална/крайна станция и време.
     *  7. Преминава към следващия блок, започвайки от крайната станция на предишния.
     *  8. Спира, когато достигне последната спирка на маршрута.
     *
     * @param RouteSegment         $segment Един маршрутен сегмент (напр. "101-morning")
     * @param GenerationParameters $params  Параметри на генерирането
     * @return DrivingBlock[]               Масив от блокове за управление за този сегмент
     */
    public function generateBlocks(RouteSegment $segment, GenerationParameters $params): array
    {
        $stops = $segment->stops;

        // Маршрут с по-малко от 2 спирки не може да формира блок
        if (\count($stops) < 2) {
            return [];
        }

        // Максимално и минимално допустимо време за непрекъснато управление (в секунди)
        $maxDrive = $params->maxDriveSeconds();
        $minDrive = $params->minDriveSeconds();

        // Индекс на последната спирка — използва се за проверка дали сме стигнали края
        $lastIdx = \count($stops) - 1;

        // Начална и крайна станция на целия маршрут (обикновено Depo)
        $routeStart = $segment->startStation();
        $routeEnd = $segment->endStation();

        $blocks = [];        // Резултатен масив с блокове
        $blockIndex = 0;     // Пореден номер на блока в рамките на сегмента
        $startIdx = 0;       // Индекс на спирката, от която започва текущият блок

        // Основен цикъл: докато не обработим всички спирки
        while ($startIdx < \count($stops) - 1) {
            $startStop = $stops[$startIdx];

            // Краен срок: началното време + максималното управление
            $deadline = $startStop->time + $maxDrive;

            // --- Търсене на най-далечната подходяща крайна станция ---
            // Сканираме напред и запомняме последната позиция, която е:
            //  а) станция за оборот (crew-change), ИЛИ
            //  б) последната спирка на маршрута (депо)
            // и е в рамките на deadline.
            $bestEndIdx = -1;
            for ($i = $startIdx + 1; $i < \count($stops); $i++) {
                $stop = $stops[$i];

                // Ако спирката е след крайния срок — спираме търсенето
                if ($stop->time > $deadline) {
                    break;
                }

                // Запомняме позицията, ако спирката е подходяща за край на блок
                if ($params->isCrewChangeStation($stop->station) || $i === $lastIdx || $i === 0) {
                    $bestEndIdx = $i;
                }
            }

            // Резервен вариант: ако няма подходяща crew-change станция в прозореца,
            // вземаме просто следващата спирка (блокът ще бъде кратък)
            if ($bestEndIdx === -1) {
                $bestEndIdx = $startIdx + 1;
            }

            $endStop = $stops[$bestEndIdx];

            // --- Предпочитание за crew-change станция ---
            // Ако намерената крайна спирка НЕ е станция за оборот и НЕ е последната
            // спирка на маршрута, търсим назад за по-близка crew-change станция.
            // Целта: блоковете да завършват на станция, където може да стане смяна на екипаж.
            // При наличие на minDrive, предпочитаме блокове с продължителност >= minDrive.
            if (!$params->isCrewChangeStation($endStop->station) && $bestEndIdx !== $lastIdx) {
                for ($i = $bestEndIdx - 1; $i > $startIdx; $i--) {
                    if ($params->isCrewChangeStation($stops[$i]->station)) {
                        $candidateDur = $stops[$i]->time - $startStop->time;
                        // Предпочитаме crew-change станция, която дава блок >= minDrive
                        if ($candidateDur >= $minDrive || $i === $startIdx + 1) {
                            $bestEndIdx = $i;
                            $endStop = $stops[$i];
                            break;
                        }
                    }
                }
            }

            // Създаваме нов блок за управление с всички данни
            $blocks[] = new DrivingBlock(
                routeId: $segment->routeId,           // Идентификатор на маршрута (напр. "101-morning")
                train: $segment->train,                // Номер на влака (напр. 101)
                blockIndex: $blockIndex,               // Пореден номер на блока в сегмента
                boardStation: $startStop->station,     // Станция на качване (начало на блока)
                boardTime: $startStop->time,           // Време на качване (секунди от полунощ)
                alightStation: $endStop->station,      // Станция на слизане (край на блока)
                alightTime: $endStop->time,            // Време на слизане (секунди от полунощ)
                routeStartStation: $routeStart,        // Начална станция на целия маршрут (депо)
                routeEndStation: $routeEnd,            // Крайна станция на целия маршрут (депо)
            );
            $blockIndex++;

            // Ако сме стигнали последната спирка — маршрутът е покрит изцяло
            if ($bestEndIdx === $lastIdx) {
                break;
            }

            // Следващият блок започва от крайната станция на текущия
            $startIdx = $bestEndIdx;
        }

        return $blocks;
    }
}
