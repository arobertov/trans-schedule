<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\ShiftEntry;
use App\Entity\ShiftScheduleDetails;
use App\Entity\ShiftSchedules;

/**
 * Преобразувател на генерирани смени към Doctrine entities за запис в БД.
 *
 * Преобразува масив от GeneratedShift обекти в ShiftScheduleDetails entities,
 * готови за persist в базата данни. За всяка смяна изчислява:
 *
 *  - at_doctor      — час на при лекар (начало на смяната - doctor_offset)
 *  - at_duty_officer — час при дежурен (начало на смяната - duty_offset)
 *  - shift_end       — край на смяната (от последния блок)
 *  - worked_time     — обща продължителност на смяната (от начало до край)
 *  - night_work      — нощен труд (припокриване на блокове с нощния прозорец)
 *  - zero_time       — престой = обща продължителност - общо управление (в минути)
 *  - routes          — JSON масив с маршрутите и станциите (с преводи на имена)
 */
final class ShiftScheduleMapper
{
    /**
     * Базова карта за превод на станции: вътрешно име → име за показване.
     * Depo → Депо е единственият хардкодван запис.
     */
    private const BASE_STATION_MAP = [
        'Depo' => 'Депо',
    ];

    /**
     * Изгражда пълна карта за превод на станции, включително динамичните
     * станции за оборот (crew-change), които идват от параметрите.
     *
     * Пример: ['Depo' => 'Депо', '14_1' => 'МС-14', '14_2' => 'МС-14']
     *
     * @param GenerationParameters $params Параметри с конфигурирани crew-change станции
     * @return array<string, string>       Карта: вътрешно име → име за показване
     */
    private function buildStationMap(GenerationParameters $params): array
    {
        $map = self::BASE_STATION_MAP;
        foreach ($params->crewChangeStations as $station) {
            $map[$station] = $params->crewChangeStationLabel;
        }

        return $map;
    }

    /**
     * Основен метод: преобразува масив от генерирани смени в entities.
     *
     * @param GeneratedShift[]     $shifts   Генерираните смени (от ShiftAssigner)
     * @param ShiftSchedules       $schedule Родителският график, към който принадлежат
     * @param GenerationParameters $params   Параметри за изчисление на офсети и нощен труд
     * @return ShiftScheduleDetails[]        Масив от entities, готови за persist
     */
    public function map(array $shifts, ShiftSchedules $schedule, GenerationParameters $params): array
    {
        $details = [];

        foreach ($shifts as $shift) {
            $detail = $this->mapShift($shift, $schedule, $params);
            $details[] = $detail;
        }

        return $details;
    }

    /**
     * Преобразува една генерирана смяна в ShiftScheduleDetails entity.
     *
     * Изчислява всички полета на entity-то от данните на смяната и параметрите.
     *
     * @param GeneratedShift       $shift    Генерираната смяна
     * @param ShiftSchedules       $schedule Родителският график
     * @param GenerationParameters $params   Параметри за изчисления
     * @return ShiftScheduleDetails          Готов entity за запис
     */
    private function mapShift(GeneratedShift $shift, ShiftSchedules $schedule, GenerationParameters $params): ShiftScheduleDetails
    {
        $detail = new ShiftScheduleDetails();
        $detail->setShiftSchedule($schedule);
        $detail->setShiftCode($shift->shiftId);

        $startTime = $shift->startTime();  // Начало на смяната (секунди от полунощ)
        $endTime = $shift->endTime();      // Край на смяната (секунди от полунощ)

        // При лекар: начало на смяната минус офсет за лекарски преглед
        // Пример: смяна от 06:00 с офсет 60 мин → при лекар 05:00
        $doctorTime = max(0, $startTime - $params->doctorOffsetMinutes * 60);
        $detail->setAtDoctor($this->secondsToHHMM($doctorTime));

        // При дежурен: начало на смяната минус офсет за явяване при дежурен
        // Пример: смяна от 06:00 с офсет 30 мин → при дежурен 05:30
        $dutyTime = max(0, $startTime - $params->dutyOfficerOffsetMinutes * 60);
        $detail->setAtDutyOfficer($this->secondsToHHMM($dutyTime));

        // Край на смяната: време на слизане от последния блок
        $detail->setShiftEnd($this->secondsToHHMM($endTime));

        // Отработено време: обща продължителност от начало до край на смяната
        $detail->setWorkedTime($this->secondsToHHMM($shift->totalDuration()));

        // Нощен труд: припокриване на блоковете с конфигурирания нощен прозорец
        // (по подразбиране 22:00–06:00)
        $nightWork = $this->calculateNightWork($shift, $params);
        $detail->setNightWork($nightWork > 0 ? $this->secondsToHHMM($nightWork) : '00:00');

        // Километри: по подразбиране 0, защото разстоянията не идват от разписанието
        $detail->setKilometers(0.0);

        // Престой (zero_time): разлика между общата продължителност и чистото управление
        // Пример: смяна 10ч, управление 7ч → престой = 3ч = 180 мин
        $idleSeconds = $shift->totalDuration() - $shift->totalDrive();
        $idleMinutes = intdiv($idleSeconds, 60);
        $detail->setZeroTime($idleMinutes);

        // Маршрути: JSON масив с детайли за всеки блок (станции, времена, влак)
        $routes = $this->buildRoutes($shift, $params);
        $detail->setRoutes($routes);

        return $detail;
    }

    /**
     * Изчислява нощен труд: сумата от припокриването на всеки блок с нощния прозорец.
     *
     * Обработва два случая:
     *  1. Нощният прозорец преминава полунощ (напр. 22:00–06:00):
     *     Разделя го на два подинтервала: 22:00–24:00 и 00:00–06:00,
     *     и проверява припокриването с всеки поотделно.
     *     За блокове, преминаващи в следващия ден (>86400 сек.), проверява
     *     и допълнителен интервал 24:00–30:00.
     *  2. Нощният прозорец е в рамките на едно денонощие:
     *     Директно изчислява припокриването.
     *
     * @param GeneratedShift       $shift Смяната с блокове
     * @param GenerationParameters $params Параметри с нощен прозорец
     * @return int                        Нощен труд в секунди
     */
    private function calculateNightWork(GeneratedShift $shift, GenerationParameters $params): int
    {
        $nightStart = $params->nightWorkStartSeconds;  // Начало на нощния прозорец (напр. 79200 = 22:00)
        $nightEnd = $params->nightWorkEndSeconds;      // Край на нощния прозорец (напр. 21600 = 06:00)
        $totalNight = 0;

        foreach ($shift->entries as $entry) {
            $b = $entry->block;
            $blockStart = $b->boardTime;   // Начало на блока (секунди от полунощ)
            $blockEnd = $b->alightTime;     // Край на блока (секунди от полунощ)

            if ($nightStart > $nightEnd) {
                // Нощен прозорец преминава полунощ, напр. 22:00–06:00
                // Прозорец 1: от nightStart до полунощ (24:00)
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, $nightStart, 86400);
                // Прозорец 2: от полунощ (00:00) до nightEnd
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, 0, $nightEnd);
                // За блокове преминаващи в следващото денонощие (време > 86400)
                if ($blockEnd > 86400) {
                    $totalNight += $this->overlapSeconds($blockStart, $blockEnd, 86400, 86400 + $nightEnd);
                }
            } else {
                // Нощен прозорец в рамките на едно денонощие — директно припокриване
                $totalNight += $this->overlapSeconds($blockStart, $blockEnd, $nightStart, $nightEnd);
            }
        }

        return $totalNight;
    }

    /**
     * Изчислява припокриването (в секунди) между два интервала [aStart, aEnd) и [bStart, bEnd).
     *
     * @param int $aStart Начало на първия интервал
     * @param int $aEnd   Край на първия интервал
     * @param int $bStart Начало на втория интервал
     * @param int $bEnd   Край на втория интервал
     * @return int        Припокриване в секунди (≥ 0)
     */
    private function overlapSeconds(int $aStart, int $aEnd, int $bStart, int $bEnd): int
    {
        $start = max($aStart, $bStart);
        $end = min($aEnd, $bEnd);

        return max(0, $end - $start);
    }

    /**
     * Изгражда JSON-съвместим масив с маршрутите на смяната.
     *
     * За всеки блок (ShiftEntry) генерира запис с:
     *  - route: числов номер на маршрута (101-morning → 101)
     *  - route_kilometers: километри (0.0 — не е налично)
     *  - pickup_location: станция на качване (с преведено име)
     *  - pickup_route_number: номер на влака
     *  - in_schedule: час на качване (HH:MM)
     *  - from_schedule: час на слизане (HH:MM)
     *  - dropoff_location: станция на слизане (с преведено име)
     *  - dropoff_route_number: номер на влака
     *
     * @return list<array<string, mixed>> Масив от маршрутни записи
     */
    private function buildRoutes(GeneratedShift $shift, GenerationParameters $params): array
    {
        $routes = [];
        $stationMap = $this->buildStationMap($params);

        foreach ($shift->entries as $entry) {
            $b = $entry->block;

            // Извличаме числовата част от маршрута (напр. '101-morning' → 101)
            $routeNumeric = (int) preg_replace('/[^0-9]/', '', explode('-', $b->routeId)[0]);

            $routes[] = [
                'route' => $routeNumeric,
                'route_kilometers' => 0.0,
                'pickup_location' => $this->mapStation($b->boardStation, $stationMap),
                'pickup_route_number' => $b->train,
                'in_schedule' => $this->secondsToHHMM($b->boardTime),
                'from_schedule' => $this->secondsToHHMM($b->alightTime),
                'dropoff_location' => $this->mapStation($b->alightStation, $stationMap),
                'dropoff_route_number' => $b->train,
            ];
        }

        return $routes;
    }

    /**
     * Превежда вътрешното име на станция към име за показване.
     *
     * Ако станцията е в картата (напр. 'Depo' → 'Депо', '14_1' → 'МС-14'),
     * връща преведеното име. Иначе връща оригиналното.
     *
     * @param string               $station    Вътрешно име на станцията
     * @param array<string, string> $stationMap Карта за превод
     * @return string                          Име за показване
     */
    private function mapStation(string $station, array $stationMap): string
    {
        if (isset($stationMap[$station])) {
            return $stationMap[$station];
        }

        return $station;
    }

    /**
     * Преобразува секунди от полунощ в низ „HH:MM" (24-часов формат).
     *
     * Обработва и стойности > 86400 (следващо денонощие) чрез модулен час (% 24).
     * Пример: 90000 сек. = 25:00 → „01:00"
     *
     * @param int $seconds Секунди от полунощ (може да е > 86400)
     * @return string      Форматиран час, напр. „06:30", „22:00"
     */
    private function secondsToHHMM(int $seconds): string
    {
        $h = intdiv(abs($seconds), 3600) % 24;
        $m = intdiv(abs($seconds) % 3600, 60);

        return sprintf('%02d:%02d', $h, $m);
    }
}
