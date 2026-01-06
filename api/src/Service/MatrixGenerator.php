<?php

namespace App\Service;

use App\Entity\Matrix;
use App\Entity\OrderPattern;
use App\Entity\OrderPatternDetails;
use App\Entity\PatternColumn;
use DateTimeImmutable;
use InvalidArgumentException;

class MatrixGenerator
{
    /**
     * Генерира матрица за зададен месец/година и порядък.
     */
    public function generate(Matrix $matrix): Matrix
    {
        $pattern = $matrix->getPattern();
        $year = $matrix->getYear();
        $month = $matrix->getMonth();
        $startPosition = $matrix->getStartPosition();

        if (!$pattern instanceof OrderPattern) {
            throw new InvalidArgumentException('Порядъкът е задължителен.');
        }

        if ($year === null || $month === null) {
            throw new InvalidArgumentException('Годината и месецът са задължителни.');
        }

        $totalPositions = $pattern->getTotalPositions() ?? 0;
        if ($totalPositions < 1) {
            throw new InvalidArgumentException('Порядъкът няма дефинирани позиции.');
        }

        if ($startPosition < 1 || $startPosition > $totalPositions) {
            throw new InvalidArgumentException('Началната позиция трябва да е в диапазона на порядъка.');
        }

        $columns = $pattern->getColumns()->toArray();
        if (count($columns) === 0) {
            throw new InvalidArgumentException('Порядъкът няма дефинирани колони.');
        }

        // Хедър по дни
        // Ако вече имаме хедър (напр. потребителят е редактирал типовете дни), използваме го.
        // Освен ако месеца/годината не са се променили драстично (проверка за съответствие).
        $existingHeader = $matrix->getHeader();
        $shouldRegenerate = true;
        
        if (!empty($existingHeader) && is_array($existingHeader)) {
            // Проста проверка: дали първият елемент отговаря на година/месец
            $firstDate = $existingHeader[0]['date'] ?? '';
            if (str_starts_with($firstDate, sprintf('%04d-%02d', $year, $month))) {
                $shouldRegenerate = false;
            }
        }

        $header = $shouldRegenerate ? $this->buildHeader($year, $month) : $existingHeader;

        // Map на позиции -> детайли за бърз достъп
        $detailsMap = $this->buildDetailsMap($pattern);

        // Генериране на редове
        $rows = $this->buildRows($header, $columns, $detailsMap, $totalPositions, $startPosition);

        $matrix->setHeader($header);
        $matrix->setRows($rows);
        $matrix->setUpdatedAt(new DateTimeImmutable());

        if ($matrix->getCreatedAt() === null) {
            $matrix->setCreatedAt(new DateTimeImmutable());
        }

        return $matrix;
    }

    private function buildHeader(int $year, int $month): array
    {
        // Use DateTime to avoid calendar extension dependency
        $daysInMonth = (int) (new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->format('t');
        $dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
        
        $holidays = $this->getBulgarianHolidays($year);

        // Pre-calculate status for previous month end, current month, next month start
        // -1 day to +1 day beyond month scope to calculate context
        $start = new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $end = $start->modify('last day of this month');
        
        $prevDate = $start->modify('-1 day');
        $nextDate = $end->modify('+1 day');
        
        // Helper to check status - 'W' (Work) or 'H' (Rest/Holiday)
        $getStatus = function (DateTimeImmutable $d) use ($holidays) {
            $formatted = $d->format('Y-m-d');
            $isWeekend = (int)$d->format('N') >= 6;
            // A weekend is a holiday unless it's a working Saturday (not handling working saturdays here for now)
            // A holiday is a holiday
            if (in_array($formatted, $holidays, true)) {
                return 'H';
            }
            return $isWeekend ? 'H' : 'W';
        };

        $header = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDate = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));
            
            // Determine contexts
            $prevDay = $currentDate->modify('-1 day');
            $nextDay = $currentDate->modify('+1 day');
            
            $statusCurrent = $getStatus($currentDate);
            $statusPrev = $getStatus($prevDay);
            $statusNext = $getStatus($nextDay);
            
            // Logic Mapping based on User requirements:
            // W -> Делник
            // H -> Check Neighbors
            
            $dayType = 'Делник'; // Default
            
            if ($statusCurrent === 'W') {
                $dayType = 'Делник';
            } else {
                // Determine H context
                if ($statusPrev === 'W' && $statusNext === 'W') {
                    $dayType = 'Делник_Празник_Делник'; // W-H-W
                } elseif ($statusPrev === 'W' && $statusNext === 'H') {
                    $dayType = 'Делник_Празник'; // W-H-H
                } elseif ($statusPrev === 'H' && $statusNext === 'H') {
                    $dayType = 'Празник_Празник_Празник'; // H-H-H
                } elseif ($statusPrev === 'H' && $statusNext === 'W') {
                    $dayType = 'Празник_Делник'; // H-H-W
                } else {
                    // Fallback for edge cases (e.g. single day weekend? Unlikely in standard calendar)
                    // If e.g. Start of time? 
                    $dayType = 'Празник_Делник'; // Treat as standard weekend end if unsure
                }
            }

            $weekday = (int)$currentDate->format('N');
            
            $header[] = [
                'date' => $currentDate->format('Y-m-d'),
                'day' => $dayLabels[$weekday - 1] ?? (string) $weekday,
                'weekday' => $weekday,
                'day_type' => $dayType,
            ];
        }

        return $header;
    }

    private function getBulgarianHolidays(int $year): array
    {
        $holidays = [
            "$year-01-01", // New Year
            "$year-03-03", // Liberation Day
            "$year-05-01", // Labor Day
            "$year-05-06", // Gergyovden
            "$year-05-24", // Culture/Education
            "$year-09-06", // Unification
            "$year-09-22", // Independence
            "$year-12-24", // Christmas Eve
            "$year-12-25", // Christmas
            "$year-12-26", // Christmas 2nd Day
        ];

        // Orthodox Easter Calculation
        // Meeus/Jones/Butcher's algorithm for Julian Easter
        $a = $year % 4;
        $b = $year % 7;
        $c = $year % 19;
        $d = (19 * $c + 15) % 30;
        $e = (2 * $a + 4 * $b - $d + 34) % 7;
        $month = floor(($d + $e + 114) / 31);
        $day = (($d + $e + 114) % 31) + 1;
        
        $easterDate = new DateTimeImmutable("$year-$month-$day"); // Julian Date
        $easterDate = $easterDate->modify('+13 days'); // Convert to Gregorian for current era
        
        // Add Easter Holidays
        $holidays[] = $easterDate->modify('-2 days')->format('Y-m-d'); // Good Friday
        $holidays[] = $easterDate->modify('-1 day')->format('Y-m-d');  // Holy Saturday
        $holidays[] = $easterDate->format('Y-m-d');                    // Easter Sunday
        $holidays[] = $easterDate->modify('+1 day')->format('Y-m-d');  // Easter Monday

        return $holidays;
    }


    /**
     * @return array<int, OrderPatternDetails>
     */
    private function buildDetailsMap(OrderPattern $pattern): array
    {
        $map = [];
        foreach ($pattern->getDetails() as $detail) {
            if ($detail instanceof OrderPatternDetails && $detail->getPositionNumber() !== null) {
                $map[$detail->getPositionNumber()] = $detail;
            }
        }
        return $map;
    }

    private function buildRows(array $header, array $columns, array $detailsMap, int $totalPositions, int $startPosition): array
    {
        // Подготвяме нормализирани имена на колоните за съпоставяне
        $columnNames = array_map(static function (PatternColumn $col) {
            return $col->getColumnName();
        }, $columns);

        $rows = [];
        $daysCount = count($header);

        for ($rowIndex = 0; $rowIndex < $totalPositions; $rowIndex++) {
            $rowStart = (($startPosition - 1 + $rowIndex) % $totalPositions) + 1;
            $cells = [];

            for ($dayIndex = 0; $dayIndex < $daysCount; $dayIndex++) {
                $targetPosition = (($rowStart - 1 + $dayIndex) % $totalPositions) + 1;
                $detail = $detailsMap[$targetPosition] ?? null;

                $dayType = $header[$dayIndex]['day_type'] ?? 'делник';
                $columnName = $this->resolveColumnName($columnNames, $dayType);
                $value = null;

                if ($detail) {
                    $values = $detail->getValues();
                    $value = $values[$columnName] ?? null;
                }

                $cells[] = [
                    'date' => $header[$dayIndex]['date'] ?? null,
                    'day' => $header[$dayIndex]['day'] ?? null,
                    'column' => $columnName,
                    'source_position' => $targetPosition,
                    'value' => $value,
                ];
            }

            $rows[] = [
                'row' => $rowIndex + 1,
                'start_position' => $rowStart,
                'cells' => $cells,
            ];
        }

        return $rows;
    }

    /**
     * Нормализира имената (пример: "Делник" -> "делник") и съпоставя с наличните колони.
     */
    private function resolveColumnName(array $columnNames, string $dayType): string
    {
        $normalizedDayType = $this->normalize($dayType);

        foreach ($columnNames as $name) {
            if ($this->normalize($name) === $normalizedDayType) {
                return $name;
            }
        }

        // Ако няма точен мач, връщаме първата дефинирана колона
        return $columnNames[0];
    }

    private function normalize(string $value): string
    {
        $lower = mb_strtolower($value);
        $normalized = preg_replace('/[^a-zа-я0-9]+/u', '_', $lower) ?? $lower;
        return trim($normalized, '_');
    }
}
