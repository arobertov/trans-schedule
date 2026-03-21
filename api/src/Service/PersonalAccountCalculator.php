<?php

namespace App\Service;

use App\Entity\Employees;
use App\Entity\MonthlySchedule;
use App\Entity\PersonalAccount;
use App\Entity\ShiftScheduleDetails;
use App\Repository\EmployeesRepository;
use App\Repository\PersonalAccountRepository;
use App\Repository\ShiftScheduleDetailsRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class PersonalAccountCalculator
{
    private const NIGHT_WORK_CORRECTION_FACTOR = 0.143;
    private const PJM_POSITION_NAME = 'Машинист ПЖМ';

    /** @var array<string, bool> */
    private const EXEMPTION_CODES = [
        'О' => true,
        'Б' => true,
        'М' => true,
        'С' => true,
        'А' => true,
        'У' => true,
        'O' => true,
        'B' => true,
        'M' => true,
        'C' => true,
        'A' => true,
        'U' => true,
    ];

    public function __construct(
        private EntityManagerInterface $entityManager,
        private ShiftScheduleDetailsRepository $shiftScheduleDetailsRepository,
        private PersonalAccountRepository $personalAccountRepository,
        private EmployeesRepository $employeesRepository,
    ) {
    }

    public function recalculate(PersonalAccount $account): PersonalAccount
    {
        $monthlySchedule = $account->getMonthlySchedule();
        $employee = $account->getEmployee();

        if ($monthlySchedule === null || $employee === null) {
            return $account;
        }

        $account->setYear($monthlySchedule->getYear());
        $account->setMonth($monthlySchedule->getMonth());
        $account->setPosition($monthlySchedule->getPosition());
        $account->setEmployeeName($this->buildEmployeeName($employee));

        $maps = $this->buildShiftMaps($monthlySchedule);

        $existingProtocolByDate = [];
        foreach (($account->getDetailRows() ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $date = (string) ($row['date'] ?? '');
            if ($date === '') {
                continue;
            }
            $protocol = $this->toFloat($row['protocol_dpk'] ?? 0.0);
            $existingProtocolByDate[$date] = $protocol;
        }

        $scheduleRows = $monthlySchedule->getScheduleRows() ?? [];
        $employeeScheduleRow = null;
        $targetEmployeeId = (int) $employee->getId();

        foreach ($scheduleRows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ($this->normalizeEmployeeId($row['employee_id'] ?? null) === $targetEmployeeId) {
                $employeeScheduleRow = $row;
                break;
            }
        }

        if ($employeeScheduleRow === null) {
            $account->setDetailRows([]);
            $account->setIndividualNormMinutes(0);
            $account->setWorkedTimeMinutes(0);
            $account->setNightWorkMinutes(0);
            $account->setNightCorrection1143Minutes(0);
            $account->setWorkedWithCorrectionMinutes(0);
            $account->setZeroTimeMinutes(0);
            $account->setKilometersTotal(0);
            $account->setNightWorkX24(number_format(0, 2, '.', ''));
            $account->setCurrentMonthBalanceMinutes(0);
            $account->setPreviousMonthBalanceMinutes(0);
            $account->setPeriodTotalMinutes(0);

            return $account;
        }

        $year = (int) ($monthlySchedule->getYear() ?? 0);
        $month = (int) ($monthlySchedule->getMonth() ?? 0);
        $daysInMonth = $year > 0 && $month > 0 ? $this->getDaysInMonth($year, $month) : 0;
        $monthNormMinutes = $this->resolveMonthNormMinutes($monthlySchedule, $year, $month);

        $detailRows = [];
        $exemptCount = 0;
        $workedTotalMinutes = 0;
        $nightTotalMinutes = 0;
        $zeroTotalMinutes = 0;
        $kilometersTotal = 0.0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $shiftCode = strtoupper(trim((string) ($employeeScheduleRow['day_' . $day] ?? '')));
            if ($shiftCode === '') {
                continue;
            }

            if (isset(self::EXEMPTION_CODES[$shiftCode])) {
                $exemptCount++;
            }

            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $isHolidayLikeDay = $this->isHolidayLikeDay($year, $month, $day);
            $shiftData = $isHolidayLikeDay
                ? ($maps['holiday'][$shiftCode] ?? ['worked' => 0, 'night' => 0, 'zero' => 0, 'km' => 0.0])
                : ($maps['weekday'][$shiftCode] ?? ['worked' => 0, 'night' => 0, 'zero' => 0, 'km' => 0.0]);

            $protocolDpk = $existingProtocolByDate[$date] ?? 0.0;
            $kilometersBase = (float) ($shiftData['km'] ?? 0.0);
            $kilometersWithProtocol = round($kilometersBase + $protocolDpk, 2);

            $workedMinutes = (int) ($shiftData['worked'] ?? 0);
            $nightMinutes = (int) ($shiftData['night'] ?? 0);
            $zeroMinutes = (int) ($shiftData['zero'] ?? 0);

            $workedTotalMinutes += $workedMinutes;
            $nightTotalMinutes += $nightMinutes;
            $zeroTotalMinutes += $zeroMinutes;
            $kilometersTotal += $kilometersWithProtocol;

            $detailRows[] = [
                'date' => $date,
                'shift' => $shiftCode,
                'worked_time' => $this->formatMinutesToHHMM($workedMinutes),
                'night_work' => $this->formatMinutesToHHMM($nightMinutes),
                'kilometers' => round($kilometersBase, 2),
                'protocol_dpk' => round($protocolDpk, 2),
                'kilometers_total' => $kilometersWithProtocol,
            ];
        }

        $individualNormMinutes = $monthNormMinutes - ($exemptCount * 8 * 60);
        if ($individualNormMinutes < 0) {
            $individualNormMinutes = 0;
        }

        $nightCorrectionMinutes = (int) round($nightTotalMinutes * self::NIGHT_WORK_CORRECTION_FACTOR);
        $workedWithCorrectionMinutes = $workedTotalMinutes + $nightCorrectionMinutes;
        $currentMonthBalance = $workedWithCorrectionMinutes - $individualNormMinutes;
        $previousMonthBalance = $this->resolvePreviousBalance($account);
        $periodTotal = $previousMonthBalance + $currentMonthBalance;

        $account->setDetailRows($detailRows);
        $account->setIndividualNormMinutes($individualNormMinutes);
        $account->setWorkedTimeMinutes($workedTotalMinutes);
        $account->setNightWorkMinutes($nightTotalMinutes);
        $account->setNightCorrection1143Minutes($nightCorrectionMinutes);
        $account->setWorkedWithCorrectionMinutes($workedWithCorrectionMinutes);
        $account->setZeroTimeMinutes($zeroTotalMinutes);
        $account->setKilometersTotal(round($kilometersTotal, 2));
        $account->setNightWorkX24(number_format($nightTotalMinutes / 60, 2, '.', ''));
        $account->setPreviousMonthBalanceMinutes($previousMonthBalance);
        $account->setCurrentMonthBalanceMinutes($currentMonthBalance);
        $account->setPeriodTotalMinutes($periodTotal);

        return $account;
    }

    public function recalculateForMonthlySchedule(MonthlySchedule $monthlySchedule): int
    {
        $position = $monthlySchedule->getPosition();
        if ($position === null) {
            return 0;
        }

        $positionName = trim((string) $position->getName());
        if ($positionName !== self::PJM_POSITION_NAME) {
            return 0;
        }

        $rows = $monthlySchedule->getScheduleRows() ?? [];
        $employeeIds = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $employeeId = $this->normalizeEmployeeId($row['employee_id'] ?? null);
            if ($employeeId > 0) {
                $employeeIds[$employeeId] = true;
            }
        }

        if ($employeeIds === []) {
            return 0;
        }

        $employees = $this->employeesRepository->findBy(['id' => array_keys($employeeIds)]);
        $employeesById = [];
        foreach ($employees as $employee) {
            $employeesById[(int) $employee->getId()] = $employee;
        }

        $count = 0;

        foreach (array_keys($employeeIds) as $employeeId) {
            if (!isset($employeesById[$employeeId])) {
                continue;
            }

            /** @var Employees $employee */
            $employee = $employeesById[$employeeId];
            $account = $this->personalAccountRepository->findOneByEmployeePeriod(
                $employee,
                $position,
                (int) $monthlySchedule->getYear(),
                (int) $monthlySchedule->getMonth()
            );

            if ($account === null) {
                $account = new PersonalAccount();
                $account->setEmployee($employee);
                $account->setPosition($position);
                $account->setMonthlySchedule($monthlySchedule);
                $account->setYear($monthlySchedule->getYear());
                $account->setMonth($monthlySchedule->getMonth());
                $this->entityManager->persist($account);
            } else {
                $account->setMonthlySchedule($monthlySchedule);
            }

            $this->recalculate($account);
            $count++;
        }

        $this->entityManager->flush();

        return $count;
    }

    /**
     * @return array{weekday: array<string, array{worked:int, night:int, km:float}>, holiday: array<string, array{worked:int, night:int, km:float}>}
     */
    private function buildShiftMaps(MonthlySchedule $monthlySchedule): array
    {
        $weekdayMap = [];
        $holidayMap = [];

        $weekdaySchedule = $monthlySchedule->getWeekdayShiftSchedule();
        if ($weekdaySchedule !== null) {
            $weekdayDetails = $this->shiftScheduleDetailsRepository->findBy(['shift_schedule' => $weekdaySchedule]);
            $weekdayMap = $this->mapShiftDetails($weekdayDetails);
        }

        $holidaySchedule = $monthlySchedule->getHolidayShiftSchedule();
        if ($holidaySchedule !== null) {
            $holidayDetails = $this->shiftScheduleDetailsRepository->findBy(['shift_schedule' => $holidaySchedule]);
            $holidayMap = $this->mapShiftDetails($holidayDetails);
        }

        return [
            'weekday' => $weekdayMap,
            'holiday' => $holidayMap,
        ];
    }

    /**
     * @param ShiftScheduleDetails[] $details
     *
    * @return array<string, array{worked:int, night:int, zero:int, km:float}>
     */
    private function mapShiftDetails(array $details): array
    {
        $map = [];

        foreach ($details as $detail) {
            $code = strtoupper(trim((string) $detail->getShiftCode()));
            if ($code === '') {
                continue;
            }

            $map[$code] = [
                'worked' => $this->parseHHMMToMinutes($detail->getWorkedTime()),
                'night' => $this->parseHHMMToMinutes($detail->getNightWork()),
                'zero' => $this->parseHHMMToMinutes($detail->getZeroTime()),
                'km' => round((float) $detail->getKilometers(), 2),
            ];
        }

        return $map;
    }

    private function parseHHMMToMinutes(?string $value): int
    {
        if ($value === null) {
            return 0;
        }

        $match = [];
        if (!preg_match('/^([+-]?)(\d{1,2}):(\d{2})$/', trim($value), $match)) {
            return 0;
        }

        $sign = $match[1] === '-' ? -1 : 1;
        $hours = (int) $match[2];
        $minutes = (int) $match[3];

        if ($minutes > 59) {
            return 0;
        }

        return $sign * (($hours * 60) + $minutes);
    }

    private function formatMinutesToHHMM(int $minutes): string
    {
        $sign = $minutes < 0 ? '-' : '';
        $abs = abs($minutes);
        $hh = intdiv($abs, 60);
        $mm = $abs % 60;

        return sprintf('%s%02d:%02d', $sign, $hh, $mm);
    }

    private function isHolidayLikeDay(int $year, int $month, int $day): bool
    {
        $weekDay = (int) date('N', (int) strtotime(sprintf('%04d-%02d-%02d', $year, $month, $day)));

        return $weekDay >= 6;
    }

    private function resolveMonthNormMinutes(MonthlySchedule $monthlySchedule, int $year, int $month): int
    {
        $workingHours = $monthlySchedule->getWorkingHours();
        if ($workingHours !== null && $workingHours > 0) {
            return $workingHours * 60;
        }

        $workingDays = $monthlySchedule->getWorkingDays();
        if ($workingDays !== null && $workingDays > 0) {
            return $workingDays * 8 * 60;
        }

        $daysInMonth = $this->getDaysInMonth($year, $month);
        $workDays = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            if (!$this->isHolidayLikeDay($year, $month, $day)) {
                $workDays++;
            }
        }

        return $workDays * 8 * 60;
    }

    private function resolvePreviousBalance(PersonalAccount $account): int
    {
        $employee = $account->getEmployee();
        $position = $account->getPosition();
        $year = (int) $account->getYear();
        $month = (int) $account->getMonth();

        if ($employee === null || $position === null) {
            return 0;
        }

        $currentSchedule = $account->getMonthlySchedule();
        if ($currentSchedule !== null && !$currentSchedule->getLinkPreviousMonthBalance()) {
            return 0;
        }

        $previousMonth = $month - 1;
        $previousYear = $year;

        if ($previousMonth < 1) {
            $previousMonth = 12;
            $previousYear--;
        }

        $previous = $this->personalAccountRepository->findOneByEmployeePeriod($employee, $position, $previousYear, $previousMonth);

        return $previous?->getPeriodTotalMinutes() ?? 0;
    }

    private function buildEmployeeName(Employees $employee): string
    {
        $parts = [
            trim((string) $employee->getFirstName()),
            trim((string) $employee->getMiddleName()),
            trim((string) $employee->getLastName()),
        ];

        return trim(implode(' ', array_filter($parts, static fn (string $part): bool => $part !== '')));
    }

    private function toFloat(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return round((float) $value, 2);
        }

        $normalized = str_replace(',', '.', trim((string) $value));
        if ($normalized === '' || !is_numeric($normalized)) {
            return 0.0;
        }

        return round((float) $normalized, 2);
    }

    private function normalizeEmployeeId(mixed $value): int
    {
        if (is_int($value)) {
            return $value > 0 ? $value : 0;
        }

        if (is_float($value)) {
            $casted = (int) $value;
            return $casted > 0 ? $casted : 0;
        }

        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return 0;
        }

        if (ctype_digit($raw)) {
            $parsed = (int) $raw;
            return $parsed > 0 ? $parsed : 0;
        }

        if (preg_match('~/(\d+)$~', $raw, $matches) === 1) {
            $parsed = (int) ($matches[1] ?? 0);
            return $parsed > 0 ? $parsed : 0;
        }

        return 0;
    }

    private function getDaysInMonth(int $year, int $month): int
    {
        if ($year <= 0 || $month < 1 || $month > 12) {
            return 0;
        }

        $lastDay = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));

        return (int) $lastDay->format('t');
    }
}
