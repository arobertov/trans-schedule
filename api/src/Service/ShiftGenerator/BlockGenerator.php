<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\RouteSegment;

/**
 * Генератор на блокове за управление.
 *
 * Разделя всеки маршрутен сегмент (RouteSegment) на МАКСИМАЛНО ГОЛЕМИ блокове
 * (DrivingBlock) с приоритет maxDriving → minDriving:
 *
 *  - Граничните станции са: crew-change станции (14_1, 14_2) и крайни точки на маршрута (Depo).
 *  - Всеки блок започва и завършва на гранична станция.
 *  - Блоковете обединяват последователни граници до достигане на maxDrive.
 *  - Всеки блок = едно качване на машиниста (по-малко блокове = по-малко качвания).
 *  - Режe се само когато добавянето на следващата граница би надхвърлило maxDrive.
 *  - Ако единичен участък между две граници > maxDrive, се раздробява вътрешно.
 */
final class BlockGenerator
{
    /**
     * Генерира блокове за всички подадени маршрутни сегменти.
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
     * Алгоритъмът създава МАКСИМАЛНО ГОЛЕМИ блокове (до maxDrive):
     *  1. Намира всички гранични индекси (crew-change станции + начало/край на маршрута).
     *  2. Обединява последователни граници в един блок докато продължителността ≤ maxDrive.
     *  3. Режe само когато следващата граница би надхвърлила maxDrive.
     *  4. Ако единичен участък между две граници > maxDrive — раздробява вътрешно.
     *
     * Приоритет: maxDriving → minDriving (блоковете са възможно най-големи).
     * Всеки блок представлява едно качване на машиниста (по-малко качвания = по-добре).
     *
     * @param RouteSegment         $segment Един маршрутен сегмент (напр. "101-сутрин")
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

        $lastIdx = \count($stops) - 1;

        // Стъпка 1: Намери всички гранични индекси
        // Граници: начало на маршрута (0), crew-change станции, край на маршрута
        $boundaryIndices = [0];
        for ($i = 1; $i < $lastIdx; $i++) {
            if ($params->isCrewChangeStation($stops[$i]->station)) {
                $boundaryIndices[] = $i;
            }
        }
        $boundaryIndices[] = $lastIdx;
        $boundaryIndices = array_values(array_unique($boundaryIndices));

        // Стъпка 2: Създай максимално големи блокове (до maxDrive)
        // Обединява последователни граници докато общата продължителност ≤ maxDrive
        $blocks = [];
        $blockIndex = 0;
        $bCount = \count($boundaryIndices);
        $currentStartBIdx = 0; // Индекс в $boundaryIndices — начало на текущия блок

        while ($currentStartBIdx < $bCount - 1) {
            $startStopIdx = $boundaryIndices[$currentStartBIdx];

            // Намери най-далечната граница достижима в рамките на maxDrive
            $bestEndBIdx = $currentStartBIdx + 1;
            for ($j = $currentStartBIdx + 2; $j < $bCount; $j++) {
                $dur = $stops[$boundaryIndices[$j]]->time - $stops[$startStopIdx]->time;
                if ($dur <= $params->maxDriveSeconds()) {
                    $bestEndBIdx = $j;
                } else {
                    break;
                }
            }

            $endStopIdx = $boundaryIndices[$bestEndBIdx];
            $duration = $stops[$endStopIdx]->time - $stops[$startStopIdx]->time;

            if ($duration <= 0) {
                $currentStartBIdx = $bestEndBIdx;
                continue;
            }

            // Единичен участък между две съседни граници > maxDrive — раздробяваме вътрешно
            if ($bestEndBIdx === $currentStartBIdx + 1 && $duration > $params->maxDriveSeconds()) {
                $subBlocks = $this->subdivideOversizeSegment(
                    $segment, $stops, $startStopIdx, $endStopIdx, $blockIndex, $params,
                );
                $blockIndex += \count($subBlocks);
                array_push($blocks, ...$subBlocks);
            } else {
                $blocks[] = new DrivingBlock(
                    routeId: $segment->routeId,
                    train: $segment->train,
                    blockIndex: $blockIndex,
                    boardStation: $stops[$startStopIdx]->station,
                    boardTime: $stops[$startStopIdx]->time,
                    alightStation: $stops[$endStopIdx]->station,
                    alightTime: $stops[$endStopIdx]->time,
                    routeStartStation: $segment->startStation(),
                    routeEndStation: $segment->endStation(),
                );
                $blockIndex++;
            }

            $currentStartBIdx = $bestEndBIdx;
        }

        return $blocks;
    }

    /**
     * Раздробява сегмент между две гранични станции, който надвишава maxDrive.
     *
     * Опитва да реже на спирки максимално близо до maxDrive, за да минимизира
     * броя на вътрешните блокове.
     *
     * @param RouteSegment         $segment        Маршрутният сегмент
     * @param array<int, \App\Dto\ShiftGenerator\Stop> $stops Всички спирки
     * @param int                  $fromIdx        Начален индекс (гранична станция)
     * @param int                  $toIdx          Краен индекс (следваща гранична станция)
     * @param int                  $startBlockIndex Начален blockIndex за номерация
     * @param GenerationParameters $params         Параметри на генерирането
     * @return DrivingBlock[]                       Масив от под-блокове
     */
    private function subdivideOversizeSegment(
        RouteSegment $segment,
        array $stops,
        int $fromIdx,
        int $toIdx,
        int $startBlockIndex,
        GenerationParameters $params,
    ): array {
        $blocks = [];
        $blockIndex = $startBlockIndex;
        $currentStart = $fromIdx;

        while ($currentStart < $toIdx) {
            $deadline = $stops[$currentStart]->time + $params->maxDriveSeconds();

            // Намери най-далечната спирка в рамките на maxDrive
            $bestEnd = $currentStart + 1;
            for ($i = $currentStart + 1; $i <= $toIdx; $i++) {
                if ($stops[$i]->time > $deadline) {
                    break;
                }
                $bestEnd = $i;
            }

            $blocks[] = new DrivingBlock(
                routeId: $segment->routeId,
                train: $segment->train,
                blockIndex: $blockIndex,
                boardStation: $stops[$currentStart]->station,
                boardTime: $stops[$currentStart]->time,
                alightStation: $stops[$bestEnd]->station,
                alightTime: $stops[$bestEnd]->time,
                routeStartStation: $segment->startStation(),
                routeEndStation: $segment->endStation(),
            );
            $blockIndex++;
            $currentStart = $bestEnd;
        }

        return $blocks;
    }
}
