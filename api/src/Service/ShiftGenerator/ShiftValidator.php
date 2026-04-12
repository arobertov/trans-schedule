<?php

declare(strict_types=1);

namespace App\Service\ShiftGenerator;

use App\Dto\ShiftGenerator\DrivingBlock;
use App\Dto\ShiftGenerator\GeneratedShift;
use App\Dto\ShiftGenerator\GenerationParameters;
use App\Dto\ShiftGenerator\ValidationResult;

/**
 * Валидатор на генерирания график на смените (порт от python_shift_generator/validator.py).
 *
 * Проверява генерираните смени спрямо СЪЩИТЕ динамични лимити,
 * които потребителят е избрал при генерирането.
 *
 * Извършва 7 проверки:
 *  1. Непрекъснати вериги управление ≤ max_drive (вкл. междувлакови преходи)
 *  2. Почивки между блокове ≥ min_rest (междувлак. преходи не са почивка)
 *  3. Продължителност на сутрешна смяна ≤ max_morning
 *  4. Продължителност на дневна/нощна смяна ≤ max_day / max_night
 *  5. 100% покритие на маршрутите (всеки блок присвоен точно веднъж)
 *  6. Без припокриващи се присвоявания (дублиращи блокове)
 *  7. Всички смени на екипаж на станция за оборот или крайна точка (депо)
 */
final class ShiftValidator
{
    /**
     * Основен метод: изпълнява всички валидационни проверки.
     *
     * @param GeneratedShift[]     $shifts    Генерираните смени
     * @param DrivingBlock[]       $allBlocks Всички блокове (от BlockGenerator)
     * @param GenerationParameters $params    Параметри на генерирането
     * @return ValidationResult              Резултат с грешки и предупреждения
     */
    public function validate(array $shifts, array $allBlocks, GenerationParameters $params): ValidationResult
    {
        $result = new ValidationResult();

        $this->checkDriveTime($shifts, $params, $result);
        $this->checkRestPeriods($shifts, $params, $result);
        $this->checkShiftDurations($shifts, $params, $result);
        $this->checkCoverage($shifts, $allBlocks, $result);
        $this->checkCrewChanges($shifts, $params, $result);

        return $result;
    }

    /**
     * Проверка 1: Макс. непрекъснато управление.
     *
     * За всеки блок във всяка смяна проверява дали времето за управление
     * (от качване до слизане) не превишава max_drive_minutes.
     * Ако всичко е наред — записва OK съобщение в warnings.
     */
    private function checkDriveTime(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $maxDrive = $params->maxDriveSeconds();
        $allOk = true;

        foreach ($shifts as $s) {
            $entries = $s->entries;
            $count = \count($entries);

            $chainStart = 0;
            $chainDrive = 0;

            for ($i = 0; $i < $count; $i++) {
                $b = $entries[$i]->block;
                $chainDrive += $b->driveDuration();

                // Проверяваме дали следващият блок е свързан чрез cross-train handoff
                $isCrossNext = false;
                if ($i < $count - 1) {
                    $next = $entries[$i + 1]->block;
                    $gap = $next->boardTime - $b->alightTime;
                    if ($b->train !== $next->train) {
                        $baseAlight = GenerationParameters::stationBase($b->alightStation);
                        $baseBoard  = GenerationParameters::stationBase($next->boardStation);
                        if ($baseAlight !== 'Depo' && $baseAlight === $baseBoard
                            && $gap >= 0 && $gap <= $params->crossTrainHandoffSeconds()) {
                            $isCrossNext = true;
                            $chainDrive += $gap;
                        }
                    }
                }

                if (!$isCrossNext) {
                    if ($chainDrive > $maxDrive) {
                        $chainStartBlock = $entries[$chainStart]->block;
                        $result->error(sprintf(
                            '%s: непрекъснато управление от %s до %s е %s > %d:%02d',
                            $s->shiftId, $chainStartBlock->boardTimeStr(), $b->alightTimeStr(),
                            self::formatDuration($chainDrive),
                            intdiv($params->maxDriveMinutes, 60), $params->maxDriveMinutes % 60,
                        ));
                        $allOk = false;
                    }
                    $chainStart = $i + 1;
                    $chainDrive = 0;
                }
            }
        }

        if ($allOk) {
            $result->warn(sprintf('OK Всички вериги управление <= %d:%02d', intdiv($params->maxDriveMinutes, 60), $params->maxDriveMinutes % 60));
        }
    }

    /**
     * Проверка 2: Мін. почивка между блокове.
     *
     * За всяка двойка последователни блокове в смяна проверява дали
     * времето между слизане и следващо качване е ≥ min_rest_minutes.
     *
     * Междувлаков преход (cross-train handoff) НЕ е почивка — машинистът
     * слиза от един влак и се качва на друг без прекъсване на управлението.
     * При cross-train преход не се проверява минимална почивка.
     */
    private function checkRestPeriods(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $minRest = $params->minRestSeconds();
        $allOk = true;

        foreach ($shifts as $s) {
            $entries = $s->entries;
            for ($i = 0, $len = \count($entries) - 1; $i < $len; $i++) {
                $curr = $entries[$i]->block;
                $next = $entries[$i + 1]->block;
                $rest = $next->boardTime - $curr->alightTime;

                // Междувлаков преход: различни влакове, същата базова станция,
                // не Depo, интервал в рамките на crossTrainHandoff — НЕ е почивка
                if ($curr->train !== $next->train) {
                    $baseAlight = GenerationParameters::stationBase($curr->alightStation);
                    $baseBoard  = GenerationParameters::stationBase($next->boardStation);
                    if ($baseAlight !== 'Depo' && $baseAlight === $baseBoard
                        && $rest <= $params->crossTrainHandoffSeconds() && $rest >= 0) {
                        continue;
                    }
                }

                if ($rest < $minRest) {
                    $result->error(sprintf(
                        '%s: почивка между маршрут %s(%s) и маршрут %s(%s) е %s < %d мин',
                        $s->shiftId, $curr->routeId, $curr->alightTimeStr(),
                        $next->routeId, $next->boardTimeStr(),
                        self::formatDuration($rest), $params->minRestMinutes,
                    ));
                    $allOk = false;
                }
            }
        }

        if ($allOk) {
            $result->warn(sprintf('OK Всички почивки >= %d мін (междувлакови преходи не се броят)', $params->minRestMinutes));
        }
    }

    /**
     * Проверка 3+4: Продължителност на смените (максимум и минимум).
     *
     * За всяка смяна проверява:
     *  - Максимум: дали общата продължителност не превишава лимита за типа
     *    (max_morning / max_day / max_night) → генерира грешка (error)
     *  - Минимум: дали общата продължителност не е под минималния праг
     *    (min_morning / min_day / min_night) → генерира предупреждение (warning)
     */
    private function checkShiftDurations(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $allOk = true;

        foreach ($shifts as $s) {
            $dur = $s->totalDuration();

            // ── Проверки за максимум ──
            if ($s->shiftType === GeneratedShift::TYPE_MORNING && $dur > $params->maxMorningSeconds()) {
                $result->error(sprintf(
                    '%s: сутрешна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxMorningMinutes, 60), $params->maxMorningMinutes % 60,
                ));
                $allOk = false;
            } elseif ($s->shiftType === GeneratedShift::TYPE_DAY && $dur > $params->maxDaySeconds()) {
                $result->error(sprintf(
                    '%s: дневна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxDayMinutes, 60), $params->maxDayMinutes % 60,
                ));
                $allOk = false;
            } elseif ($s->shiftType === GeneratedShift::TYPE_NIGHT && $dur > $params->maxNightSeconds()) {
                $result->error(sprintf(
                    '%s: нощна смяна %s > %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->maxNightMinutes, 60), $params->maxNightMinutes % 60,
                ));
                $allOk = false;
            }

            // ── Проверки за минимум ──
            if ($s->shiftType === GeneratedShift::TYPE_MORNING && $dur < $params->minMorningSeconds()) {
                $result->warn(sprintf(
                    'WARN %s: сутрешна смяна (%s) е под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minMorningMinutes, 60), $params->minMorningMinutes % 60,
                ));
            } elseif ($s->shiftType === GeneratedShift::TYPE_DAY && $dur < $params->minDaySeconds()) {
                $result->warn(sprintf(
                    'WARN %s: кратка дневна смяна (%s) — под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minDayMinutes, 60), $params->minDayMinutes % 60,
                ));
            } elseif ($s->shiftType === GeneratedShift::TYPE_NIGHT && $dur < $params->minNightSeconds()) {
                $result->warn(sprintf(
                    'WARN %s: кратка нощна смяна (%s) — под минимума %d:%02d',
                    $s->shiftId, self::formatDuration($dur),
                    intdiv($params->minNightMinutes, 60), $params->minNightMinutes % 60,
                ));
            }
        }

        if ($allOk) {
            $result->warn('OK Всички продължителности в рамките на лимитите');
        }
    }

    /**
     * Проверки 5+6: Покритие на маршрутите и дублирани присвоявания.
     *
     * Изгражда карта на присвояванията (ключ = "routeId:blockIndex" → shiftId)
     * и проверява:
     *  - Няма ли блок, присвоен на повече от една смяна (дубликат → error)
     *  - Всички блокове от BlockGenerator са ли присвоени (пропуснат → error)
     *  - Няма ли непознати блокове, присвоени (extra → error)
     */
    private function checkCoverage(array $shifts, array $allBlocks, ValidationResult $result): void
    {
        // Изграждаме карта: ключ на блока → id на смяната, към която е присвоен
        $assigned = [];
        $duplicateErrors = false;

        foreach ($shifts as $s) {
            foreach ($s->entries as $entry) {
                $b = $entry->block;
                $key = $b->routeId . ':' . $b->blockIndex;
                if (isset($assigned[$key])) {
                    $result->error(sprintf(
                        'Блок маршрут=%s idx=%d е присвоен на %s И %s',
                        $b->routeId, $b->blockIndex, $assigned[$key], $s->shiftId,
                    ));
                    $duplicateErrors = true;
                } else {
                    $assigned[$key] = $s->shiftId;
                }
            }
        }

        if (!$duplicateErrors) {
            $result->warn('OK Няма дублирани присвоявания');
        }

        // Проверяваме дали всички блокове от BlockGenerator са присвоени
        $allBlockKeys = [];
        foreach ($allBlocks as $b) {
            $allBlockKeys[$b->routeId . ':' . $b->blockIndex] = true;
        }

        // Липсващи блокове: генерирани от BlockGenerator, но неприсвоени
        $missing = array_diff_key($allBlockKeys, $assigned);
        if (!empty($missing)) {
            foreach (array_keys($missing) as $key) {
                $result->error(sprintf('Блок НЕ е присвоен: %s', $key));
            }
        } else {
            $result->warn('OK 100%% покритие на маршрутите (без пропуски)');
        }

        // Излишни блокове: присвоени, но не съществуват в оригиналния списък
        $extra = array_diff_key($assigned, $allBlockKeys);
        foreach (array_keys($extra) as $key) {
            $result->error(sprintf('Непознат блок присвоен: %s', $key));
        }
    }

    /**
     * Проверка 7: Смени на екипаж на допустими станции.
     *
     * За всеки вътрешен преход между блокове (не първи/последен в смяната)
     * проверява дали качването/слизането е на:
     *  а) станция за оборот (crew-change), ИЛИ
     *  б) начална/крайна точка на маршрута (депо), ИЛИ
     *  в) валиден кръстосан преход (cross-train handoff) — същата базова
     *     станция, различен влак, в рамките на допустимия интервал
     */
    private function checkCrewChanges(array $shifts, GenerationParameters $params, ValidationResult $result): void
    {
        $allOk = true;
        $stations = $params->crewChangeStations;

        foreach ($shifts as $s) {
            $entries = $s->entries;
            $count = \count($entries);

            for ($i = 0; $i < $count; $i++) {
                $b = $entries[$i]->block;

                // Проверка на точката на качване (за блокове след първия)
                if ($i > 0) {
                    $prev = $entries[$i - 1]->block;
                    $boardOk = $b->canCrewChangeAtBoard($stations) || $b->isBoardAtRouteEndpoint();

                    // Кръстосан преход: същата базова станция (без номер коловоз),
                    // не Depo, в рамките на допустимия интервал
                    if (!$boardOk) {
                        $gap = $b->boardTime - $prev->alightTime;
                        $boardOk = GenerationParameters::stationBase($prev->alightStation) !== 'Depo'
                            && GenerationParameters::stationBase($prev->alightStation) === GenerationParameters::stationBase($b->boardStation)
                            && $gap <= $params->crossTrainHandoffSeconds();
                    }

                    if (!$boardOk) {
                        $result->error(sprintf(
                            '%s: блок %d на маршрут %s се качва на \'%s\' (не е ст. за оборот, начална/крайна станция или съвместим кръстосан влак)',
                            $s->shiftId, $i, $b->routeId, $b->boardStation,
                        ));
                        $allOk = false;
                    }
                }

                // Проверка на точката на слизане (за блокове преди последния)
                if ($i < $count - 1) {
                    $next = $entries[$i + 1]->block;
                    $alightOk = $b->canCrewChangeAtAlight($stations) || $b->isAlightAtRouteEndpoint();

                    // Кръстосан преход
                    if (!$alightOk) {
                        $gap = $next->boardTime - $b->alightTime;
                        $alightOk = GenerationParameters::stationBase($b->alightStation) !== 'Depo'
                            && GenerationParameters::stationBase($b->alightStation) === GenerationParameters::stationBase($next->boardStation)
                            && $gap <= $params->crossTrainHandoffSeconds();
                    }

                    if (!$alightOk) {
                        $result->error(sprintf(
                            '%s: блок %d на маршрут %s слиза на \'%s\' (не е ст. за оборот, начална/крайна станция или съвместим кръстосан влак)',
                            $s->shiftId, $i, $b->routeId, $b->alightStation,
                        ));
                        $allOk = false;
                    }
                }
            }
        }

        if ($allOk) {
            $result->warn('OK Всички смени на екипаж на ст. за оборот, начална/крайна станция (депо) или кръстосан влак');
        }
    }

    /**
     * Форматира продължителност в секунди като „Ч:ММ" низ.
     *
     * @param int $seconds Продължителност в секунди
     * @return string      Форматиран низ, напр. „2:30", „11:00"
     */
    private static function formatDuration(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv(abs($seconds) % 3600, 60);

        return sprintf('%d:%02d', $h, $m);
    }
}
