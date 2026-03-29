/**
 * Pure utility functions for UniverScheduleGrid — no hooks, no refs, no component state.
 */

import { stableStringify } from '../../../helpers/monthlyScheduleGridUtils';
import {
    GRID_ROW_OFFSET,
    PJM_POSITION_NAME,
    SUMMARY_FIELD_KEYS,
    SUMMARY_HEADERS,
    SUMMARY_HEADER_DISPLAY,
    type GridRange,
} from './scheduleConstants';

// --------------- Column width helpers ---------------

export const getShiftCodeColumnWidth = (shiftScheduleName: string) => {
    const length = String(shiftScheduleName ?? '').trim().length;
    const estimated = Math.ceil(length * 8) + 1;
    return Math.max(70, Math.min(estimated, 100));
};

export const getSummaryColumnWidths = (rows: any[]) => {
    return SUMMARY_FIELD_KEYS.map((fieldKey, index) => {
        const header = SUMMARY_HEADER_DISPLAY[SUMMARY_HEADERS[index]] || SUMMARY_HEADERS[index];
        let maxLength = header
            .split('\n')
            .reduce((max: number, part: string) => Math.max(max, String(part).trim().length), 0);

        (rows || []).forEach((row: any) => {
            const valueLength = String(row?.[fieldKey] ?? '').trim().length;
            if (valueLength > maxLength) maxLength = valueLength;
        });

        const estimated = Math.ceil(maxLength * 8) + 10;
        return Math.max(68, Math.min(estimated, 90));
    });
};

// --------------- Shift schedule helpers ---------------

export const getScheduleRefValue = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return '';
        return trimmed.startsWith('/shift_schedules/') ? trimmed : `/shift_schedules/${trimmed}`;
    }
    if (typeof value === 'number') return `/shift_schedules/${value}`;
    if (typeof value === 'object') {
        if (value['@id']) return String(value['@id']);
        if (value.id) return `/shift_schedules/${value.id}`;
    }
    return '';
};

export const buildScheduleVersionSignature = (value: any): string => {
    if (!value || typeof value !== 'object') return '';

    const status = String(value?.status ?? '');
    const linkPreviousMonthBalance = value?.link_previous_month_balance ? '1' : '0';
    const weekdayShiftSchedule = getScheduleRefValue(value?.weekday_shift_schedule);
    const holidayShiftSchedule = getScheduleRefValue(value?.holiday_shift_schedule);
    const workingDays = String(value?.working_days ?? '');
    const workingHours = String(value?.working_hours ?? '');
    const rowsJson = stableStringify(Array.isArray(value?.schedule_rows) ? value.schedule_rows : []);

    return [
        status,
        linkPreviousMonthBalance,
        weekdayShiftSchedule,
        holidayShiftSchedule,
        workingDays,
        workingHours,
        rowsJson,
    ].join('|');
};

// --------------- Sheet layout ---------------

export const getSheetLayout = (isMatrixMode: boolean, daysInMonth: number) => {
    const firstDayCol = isMatrixMode ? 8 : 3;
    const lastDayCol = firstDayCol + daysInMonth - 1;
    const duplicateNoCol = lastDayCol + 1;
    const spacerAfterNoCol = duplicateNoCol + 1;
    const summaryStartCol = spacerAfterNoCol + 1;
    const summaryEndCol = summaryStartCol + SUMMARY_HEADERS.length - 1;
    const spacerAfterSummary = summaryEndCol + 1;
    const workedHoursStartCol = spacerAfterSummary + 1;
    const workedHoursEndCol = workedHoursStartCol + daysInMonth - 1;

    return {
        firstDayCol,
        lastDayCol,
        duplicateNoCol,
        spacerAfterNoCol,
        summaryStartCol,
        summaryEndCol,
        spacerAfterSummary,
        workedHoursStartCol,
        workedHoursEndCol,
        totalColumns: workedHoursEndCol + 1,
    };
};

// --------------- Range / command helpers ---------------

export const toGridRange = (raw: any): GridRange | null => {
    if (!raw || typeof raw !== 'object') return null;

    const startRow = Number(raw.startRow);
    const endRow = Number(raw.endRow);
    const startColumn = Number(raw.startColumn);
    const endColumn = Number(raw.endColumn);

    if (![startRow, endRow, startColumn, endColumn].every(Number.isFinite)) {
        return null;
    }

    return {
        startRow: Math.min(startRow, endRow),
        endRow: Math.max(startRow, endRow),
        startColumn: Math.min(startColumn, endColumn),
        endColumn: Math.max(startColumn, endColumn),
    };
};

export const getEffectiveCommandRange = (params: any): GridRange | null => {
    const rawRanges: any[] = [];

    if (params?.range) rawRanges.push(params.range);
    if (Array.isArray(params?.ranges)) rawRanges.push(...params.ranges);
    if (params?.targetRange) rawRanges.push(params.targetRange);
    if (params?.pasteRange) rawRanges.push(params.pasteRange);
    if (params?.selection?.range) rawRanges.push(params.selection.range);
    if (Array.isArray(params?.selections)) {
        params.selections.forEach((selection: any) => {
            if (selection?.range) rawRanges.push(selection.range);
        });
    }

    const normalized = rawRanges
        .map(toGridRange)
        .filter((range): range is GridRange => Boolean(range));

    if (normalized.length === 0) return null;
    if (normalized.length === 1) return normalized[0];

    return normalized.reduce((acc, current) => ({
        startRow: Math.min(acc.startRow, current.startRow),
        endRow: Math.max(acc.endRow, current.endRow),
        startColumn: Math.min(acc.startColumn, current.startColumn),
        endColumn: Math.max(acc.endColumn, current.endColumn),
    }));
};

export const getRangeFromRowColumnMap = (input: any): GridRange | null => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minColumn = Number.POSITIVE_INFINITY;
    let maxColumn = Number.NEGATIVE_INFINITY;
    let hasAny = false;

    Object.keys(input).forEach((rowKey) => {
        const rowNumber = Number(rowKey);
        if (!Number.isInteger(rowNumber)) return;

        const rowValue = input[rowKey];
        if (!rowValue || typeof rowValue !== 'object') return;

        Object.keys(rowValue).forEach((columnKey) => {
            const columnNumber = Number(columnKey);
            if (!Number.isInteger(columnNumber)) return;

            hasAny = true;
            minRow = Math.min(minRow, rowNumber);
            maxRow = Math.max(maxRow, rowNumber);
            minColumn = Math.min(minColumn, columnNumber);
            maxColumn = Math.max(maxColumn, columnNumber);
        });
    });

    if (!hasAny) return null;

    return {
        startRow: minRow,
        endRow: maxRow,
        startColumn: minColumn,
        endColumn: maxColumn,
    };
};

// --------------- Employee display helpers ---------------

export const getEmployeeDisplayName = (emp: any) => {
    if (emp?.fullName) return String(emp.fullName).trim();
    return [emp?.first_name, emp?.middle_name, emp?.last_name].filter(Boolean).join(' ').trim();
};

export const sortEmployeesByName = (employees: any[]) => {
    return [...employees].sort((a, b) => getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), 'bg', { sensitivity: 'base' }));
};

export const getPositionColumnWidth = (positionName: string) => {
    const text = String(positionName ?? '').trim();
    const estimated = Math.max(120, Math.ceil(text.length * 8.5) + 24);
    return Math.min(estimated, 420);
};

export const getNameColumnWidth = (employees: any[]) => {
    const longestNameLength = employees.reduce((max: number, emp: any) => {
        const nameLength = getEmployeeDisplayName(emp).length;
        return Math.max(max, nameLength);
    }, 24);

    const estimated = Math.max(250, Math.ceil(longestNameLength * 8.5) + 28);
    return Math.min(estimated, 560);
};

export const isPjmPositionName = (name: any) =>
    String(name ?? '').trim().toLowerCase() === PJM_POSITION_NAME;

// --------------- Matrix resolution ---------------

export const resolveMatrixRowByNumber = (matrixRows: any[] | null, rawValue: any) => {
    const normalized = String(rawValue ?? '').trim();
    if (!normalized) {
        return { targetRow: null, rowNumber: null, invalidReason: '' };
    }

    const rowNumber = Number(normalized);
    if (!Number.isInteger(rowNumber) || rowNumber < 1) {
        return {
            targetRow: null,
            rowNumber: null,
            invalidReason: `невалиден номер "${normalized}"`
        };
    }

    if (!matrixRows || matrixRows.length === 0) {
        return { targetRow: null, rowNumber, invalidReason: '' };
    }

    const targetRow = matrixRows.find((mr: any) => Number(mr.row) === rowNumber) || matrixRows[rowNumber - 1];
    if (!targetRow) {
        return {
            targetRow: null,
            rowNumber,
            invalidReason: `ред №${rowNumber} е извън диапазона (1-${matrixRows.length})`
        };
    }

    return { targetRow, rowNumber, invalidReason: '' };
};

// --------------- Conflict detection (pure — works on sheet data) ---------------

export const getGlobalColumnConflictSummary = (sheet: any, lastEmployeeRow: number) => {
    const globalValues = new Set<string>();
    const p1Values = new Set<string>();
    const p2Values = new Set<string>();
    const p3Values = new Set<string>();

    for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
        const g = String(sheet.getCell(r, 0)?.v ?? '').trim();
        const p1 = String(sheet.getCell(r, 1)?.v ?? '').trim();
        const p2 = String(sheet.getCell(r, 2)?.v ?? '').trim();
        const p3 = String(sheet.getCell(r, 3)?.v ?? '').trim();

        if (g) globalValues.add(g);
        if (p1) p1Values.add(p1);
        if (p2) p2Values.add(p2);
        if (p3) p3Values.add(p3);
    }

    const globalVsP1 = new Set<string>(Array.from(globalValues).filter(v => p1Values.has(v)));
    const globalVsP2 = new Set<string>(Array.from(globalValues).filter(v => p2Values.has(v)));
    const globalVsP3 = new Set<string>(Array.from(globalValues).filter(v => p3Values.has(v)));

    return { globalValues, p1Values, p2Values, p3Values, globalVsP1, globalVsP2, globalVsP3 };
};

export const hasAnyGlobalColumnConflict = (summary: {
    globalVsP1: Set<string>;
    globalVsP2: Set<string>;
    globalVsP3: Set<string>;
}) => summary.globalVsP1.size > 0 || summary.globalVsP2.size > 0 || summary.globalVsP3.size > 0;

export const buildGlobalConflictMessage = (summary: {
    globalVsP1: Set<string>;
    globalVsP2: Set<string>;
    globalVsP3: Set<string>;
}) => {
    const parts: string[] = [];

    if (summary.globalVsP1.size > 0) {
        const sample = Array.from(summary.globalVsP1).slice(0, 3).join(', ');
        parts.push(`Global↔P1 [${sample}]`);
    }
    if (summary.globalVsP2.size > 0) {
        const sample = Array.from(summary.globalVsP2).slice(0, 3).join(', ');
        parts.push(`Global↔P2 [${sample}]`);
    }
    if (summary.globalVsP3.size > 0) {
        const sample = Array.from(summary.globalVsP3).slice(0, 3).join(', ');
        parts.push(`Global↔P3 [${sample}]`);
    }

    return parts.join('; ');
};
