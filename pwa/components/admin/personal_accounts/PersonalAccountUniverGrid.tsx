import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useDataProvider, useNotify, useRecordContext, useRefresh } from 'react-admin';
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-formula-ui/lib/index.css';
import { ICommandService, LocaleType, Univer, UniverInstanceType } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { SetRangeValuesCommand, UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';

import UniverDesignEnUS from '@univerjs/design/locale/en-US';
import UniverDocsUIEnUS from '@univerjs/docs-ui/locale/en-US';
import UniverSheetsFormulaUIEnUS from '@univerjs/sheets-formula-ui/locale/en-US';
import UniverSheetsUIEnUS from '@univerjs/sheets-ui/locale/en-US';
import UniverUIEnUS from '@univerjs/ui/locale/en-US';

import { formatDecimalBg, formatMinutesToHHMM, parseDecimal } from './timeFormat';

const COLUMNS = ['Дата', 'Смяна', 'Отработено време', 'Нощен труд', 'Километри', 'Протокол ДПК'];
// Два реда за по-компактна таблица
const SUMMARY_HEADERS_ROW_1 = [
    'Индивид. норма',
    'Отработ. време',
    'Нощен труд',
    'Корекция 1,143',
    'Килом. общо',
];
const SUMMARY_HEADERS_ROW_2 = [
    'Отр. време + Корекция 1,143',
    'Нулево време',
    'Нощен труд x24',
    '(+/-) за минал месец',
    '(+/-) за текущ месец',
    'Общо за периода',
];
const SUMMARY_HEADERS = [...SUMMARY_HEADERS_ROW_1, ...SUMMARY_HEADERS_ROW_2];
const BG_MONTH_NAMES: Record<number, string> = {
    1: 'ЯНУАРИ',
    2: 'ФЕВРУАРИ',
    3: 'МАРТ',
    4: 'АПРИЛ',
    5: 'МАЙ',
    6: 'ЮНИ',
    7: 'ЮЛИ',
    8: 'АВГУСТ',
    9: 'СЕПТЕМВРИ',
    10: 'ОКТОМВРИ',
    11: 'НОЕМВРИ',
    12: 'ДЕКЕМВРИ',
};

const HOLIDAY_BG = '#A7A7A7';
const HEADER_BG = '#EEECE1';
const BORDER_COLOR = '#B7B7B7';

const TITLE_ROW = 1;
const SUBTITLE_NAME_ROW = 2;
const SUBTITLE_PERIOD_ROW = 3;
const TABLE_HEADER_ROW = 5;
const TABLE_DATA_START_ROW = 6;
const SUMMARY_KM_TOTAL_COL = 5; // SUMMARY_HEADERS index 4 + 1 offset

const makeBorder = () => ({
    t: { style: 1, color: { rgb: BORDER_COLOR } },
    b: { style: 1, color: { rgb: BORDER_COLOR } },
    l: { style: 1, color: { rgb: BORDER_COLOR } },
    r: { style: 1, color: { rgb: BORDER_COLOR } },
});

const parseDayFromValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const day = Math.trunc(value);
        return day >= 1 && day <= 31 ? day : null;
    }

    const raw = String(value ?? '').trim();
    if (!raw) {
        return null;
    }

    if (/^\d{1,2}$/.test(raw)) {
        const day = Number(raw);
        return day >= 1 && day <= 31 ? day : null;
    }

    const ddmmyyyy = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (ddmmyyyy?.[1]) {
        const day = Number(ddmmyyyy[1]);
        return day >= 1 && day <= 31 ? day : null;
    }

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso?.[3]) {
        const day = Number(iso[3]);
        return day >= 1 && day <= 31 ? day : null;
    }

    return null;
};

const parseCellText = (cellValue: unknown): string => String(cellValue ?? '').trim();

const toResourceIri = (value: unknown, resource: string): string | null => {
    if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) {
            return null;
        }

        if (raw.startsWith('/')) {
            return raw;
        }

        if (/^\d+$/.test(raw)) {
            return `/${resource}/${raw}`;
        }

        return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return `/${resource}/${Math.trunc(value)}`;
    }

    if (value && typeof value === 'object') {
        const candidate = (value as any)['@id'] ?? (value as any).id;
        return toResourceIri(candidate, resource);
    }

    return null;
};

const buildRequiredRelationsPayload = (record: any) => {
    const employee = toResourceIri(record?.employee, 'employees')
        ?? toResourceIri(record?.employee_id, 'employees');
    const position = toResourceIri(record?.position, 'positions')
        ?? toResourceIri(record?.position_id, 'positions');
    const monthlySchedule = toResourceIri(record?.monthly_schedule, 'monthly_schedules')
        ?? toResourceIri(record?.monthly_schedule_id, 'monthly_schedules');

    return {
        employee,
        position,
        monthly_schedule: monthlySchedule,
    };
};

const hasAllRequiredRelations = (payload: { employee: string | null; position: string | null; monthly_schedule: string | null }) => (
    Boolean(payload.employee) && Boolean(payload.position) && Boolean(payload.monthly_schedule)
);

const setCellValueSafely = async (
    commandService: any,
    unitId: string,
    subUnitId: string,
    sheet: any,
    row: number,
    column: number,
    value: any,
    style?: any
) => {
    try {
        await commandService.executeCommand(SetRangeValuesCommand.id, {
            unitId,
            subUnitId,
            range: { startRow: row, startColumn: column, endRow: row, endColumn: column },
            value: style !== undefined ? { v: value, s: style } : { v: value },
        });
        return;
    } catch {
        const currentCell = sheet?.getCell?.(row, column) ?? {};
        const nextCell = { ...(currentCell || {}) };
        if (value !== undefined) nextCell.v = value;
        if (style !== undefined) nextCell.s = style;
        if (typeof sheet?.setCell === 'function') {
            sheet.setCell(row, column, nextCell);
        }
    }
};

const computeKmSignatureAndTotal = (sheet: any, daysInMonth: number): { signature: string; total: number } => {
    let total = 0;
    const parts: string[] = [];

    for (let idx = 0; idx < daysInMonth; idx += 1) {
        const rowIndex = TABLE_DATA_START_ROW + idx;
        const base = parseDecimal(sheet?.getCell?.(rowIndex, 4)?.v ?? 0);
        const protocol = parseDecimal(sheet?.getCell?.(rowIndex, 5)?.v ?? 0);
        total += base + protocol;
        parts.push(`${base}|${protocol}`);
    }

    return {
        signature: parts.join(';'),
        total: Number(total.toFixed(2)),
    };
};

const setSummaryKmTotalIfChanged = async (
    commandService: any,
    workbook: any,
    sheet: any,
    summaryValuesRow: number,
    total: number
) => {
    if (!sheet) {
        return;
    }

    const nextValue = formatDecimalBg(total);
    const currentRaw = sheet.getCell(summaryValuesRow, SUMMARY_KM_TOTAL_COL)?.v;
    const currentValue = String(currentRaw ?? '').trim();

    if (currentValue === nextValue) {
        return;
    }

    const currentCell = sheet.getCell(summaryValuesRow, SUMMARY_KM_TOTAL_COL) ?? {};
    await setCellValueSafely(
        commandService,
        workbook.getUnitId(),
        sheet.getSheetId(),
        sheet,
        summaryValuesRow,
        SUMMARY_KM_TOTAL_COL,
        nextValue,
        currentCell?.s
    );
};

export const PersonalAccountUniverGrid = () => {
    const record = useRecordContext<any>();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const univerRef = useRef<any>(null);
    const workbookRef = useRef<any>(null);
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const liveSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSerializedRowsRef = useRef<string>('');
    const lastKmSignatureRef = useRef<string>('');
    const saveInProgressRef = useRef(false);
    const requiredRelationsRef = useRef<{ employee: string | null; position: string | null; monthly_schedule: string | null } | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autosaveActive, setAutosaveActive] = useState(false);
    const [calendarNonWorkingDays, setCalendarNonWorkingDays] = useState<Set<number>>(new Set());

    const rows = useMemo(() => (Array.isArray(record?.detail_rows) ? record.detail_rows : []), [record?.detail_rows]);
    const safeYear = Number.isFinite(Number(record?.year)) ? Number(record?.year) : new Date().getFullYear();
    const safeMonth = Number.isFinite(Number(record?.month)) ? Number(record?.month) : 1;

    const toIsoDate = (day: number): string => {
        const mm = String(safeMonth).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${safeYear}-${mm}-${dd}`;
    };

    const { dayRows, extraRows, daysInMonth } = useMemo(() => {
        const monthDays = new Date(safeYear, safeMonth, 0).getDate();
        const byDay = new Map<number, any>();
        const remainder: any[] = [];

        rows.forEach((row: any) => {
            const day = parseDayFromValue(row?.date);
            if (day && day >= 1 && day <= monthDays && !byDay.has(day)) {
                byDay.set(day, row);
                return;
            }

            remainder.push(row);
        });

        const normalizedRows = Array.from({ length: monthDays }, (_, idx) => {
            const day = idx + 1;
            const existing = byDay.get(day) || {};

            const protocol = parseDecimal(existing?.protocol_dpk ?? '');
            const baseKm = parseDecimal(existing?.kilometers ?? '');
            const totalKm = parseDecimal(existing?.kilometers_total ?? '');
            const derivedProtocol = Number((totalKm - baseKm).toFixed(2));

            return {
                ...existing,
                date: day,
                shift: existing?.shift ?? '',
                worked_time: existing?.worked_time ?? '',
                night_work: existing?.night_work ?? '',
                kilometers: existing?.kilometers ?? '',
                protocol_dpk: protocol !== 0 ? protocol : (derivedProtocol !== 0 ? derivedProtocol : ''),
            };
        });

        return {
            dayRows: normalizedRows,
            extraRows: remainder,
            daysInMonth: monthDays,
        };
    }, [rows, safeMonth, safeYear]);

    useEffect(() => {
        let isMounted = true;

        const loadCalendarNonWorkingDays = async () => {
            try {
                const { data } = await dataProvider.getList('calendars', {
                    filter: { year: safeYear },
                    sort: { field: 'id', order: 'DESC' },
                    pagination: { page: 1, perPage: 1 },
                });

                const calendar = Array.isArray(data) && data.length > 0 ? data[0] : null;
                const monthInfo = calendar?.monthsData?.[safeMonth] ?? null;
                const mapByDay = monthInfo?.daysMap ?? null;
                const nonWorking = new Set<number>();

                if (mapByDay && typeof mapByDay === 'object') {
                    Object.entries(mapByDay).forEach(([key, value]) => {
                        const day = Number(key);
                        const type = String((value as any)?.type ?? '').toLowerCase();
                        if (Number.isFinite(day) && (type === 'holiday' || type === 'weekend')) {
                            nonWorking.add(day);
                        }
                    });
                }

                if (isMounted) {
                    setCalendarNonWorkingDays(nonWorking);
                }
            } catch {
                if (isMounted) {
                    setCalendarNonWorkingDays(new Set());
                }
            }
        };

        void loadCalendarNonWorkingDays();

        return () => {
            isMounted = false;
        };
    }, [dataProvider, safeMonth, safeYear]);

    const isHolidayLikeDay = (day: number): boolean => {
        if (calendarNonWorkingDays.size > 0) {
            return calendarNonWorkingDays.has(day);
        }

        const weekday = new Date(safeYear, safeMonth - 1, day).getDay();
        return weekday === 0 || weekday === 6;
    };

    const captureRowsFromSheet = (): any[] => {
        if (!workbookRef.current) {
            return dayRows;
        }

        const sheet = workbookRef.current.getActiveSheet();
        if (!sheet) {
            return dayRows;
        }

        return Array.from({ length: daysInMonth }, (_, idx) => {
            const day = idx + 1;
            const rowIndex = TABLE_DATA_START_ROW + idx;
            const existing = dayRows[idx] || {};

            return {
                ...existing,
                date: toIsoDate(day),
                shift: parseCellText(sheet.getCell(rowIndex, 1)?.v ?? existing?.shift),
                worked_time: parseCellText(sheet.getCell(rowIndex, 2)?.v ?? existing?.worked_time),
                night_work: parseCellText(sheet.getCell(rowIndex, 3)?.v ?? existing?.night_work),
                kilometers: parseCellText(sheet.getCell(rowIndex, 4)?.v ?? existing?.kilometers),
                protocol_dpk: parseDecimal(sheet.getCell(rowIndex, 5)?.v ?? existing?.protocol_dpk ?? 0),
            };
        });
    };

    const persistRows = async (silent: boolean): Promise<void> => {
        if (!record?.id || saveInProgressRef.current) {
            return;
        }

        const nextRows = captureRowsFromSheet();
        const serialized = JSON.stringify(nextRows);

        if (serialized === lastSerializedRowsRef.current) {
            return;
        }

        lastSerializedRowsRef.current = serialized;
        saveInProgressRef.current = true;
        setAutosaveActive(silent);
        setSaving(!silent);

        try {
            let requiredPayload = requiredRelationsRef.current ?? buildRequiredRelationsPayload(record);

            if (!hasAllRequiredRelations(requiredPayload)) {
                const { data: freshRecord } = await dataProvider.getOne('personal_accounts', { id: record.id });
                requiredPayload = buildRequiredRelationsPayload(freshRecord);
            }

            if (!hasAllRequiredRelations(requiredPayload)) {
                throw new Error('Липсват задължителни връзки (служител/длъжност/месечен график).');
            }

            requiredRelationsRef.current = requiredPayload;

            await dataProvider.update('personal_accounts', {
                id: record.id,
                data: {
                    ...requiredPayload,
                    detail_rows: [...nextRows, ...extraRows],
                },
                previousData: record,
            });

            if (!silent) {
                notify('Личната сметка е запазена успешно.', { type: 'success' });
            }

            if (!silent) {
                refresh();
            }
        } catch (error: any) {
            notify(error?.message || 'Грешка при запис на личната сметка.', { type: 'error' });
        } finally {
            saveInProgressRef.current = false;
            setSaving(false);
            setAutosaveActive(false);
        }
    };

    useEffect(() => {
        if (!containerRef.current || !record?.id) return;

        setLoading(true);

        try {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }

            if (liveSyncTimerRef.current) {
                clearInterval(liveSyncTimerRef.current);
                liveSyncTimerRef.current = null;
            }

            if (univerRef.current) {
                univerRef.current.dispose();
                univerRef.current = null;
                workbookRef.current = null;
            }
        } catch {
            // ignore cleanup errors
        }

        const univer = new Univer({
            theme: defaultTheme,
            locale: LocaleType.EN_US,
            locales: {
                [LocaleType.EN_US]: {
                    ...UniverDesignEnUS,
                    ...UniverDocsUIEnUS,
                    ...UniverSheetsFormulaUIEnUS,
                    ...UniverSheetsUIEnUS,
                    ...UniverUIEnUS,
                },
            },
        });

        univer.registerPlugin(UniverRenderEnginePlugin);
        univer.registerPlugin(UniverFormulaEnginePlugin);
        univer.registerPlugin(UniverUIPlugin, {
            container: containerRef.current,
            header: true,
            toolbar: true,
            footer: false,
        });
        univer.registerPlugin(UniverDocsPlugin, { hasScroll: false });
        univer.registerPlugin(UniverDocsUIPlugin);
        univer.registerPlugin(UniverSheetsPlugin);
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        univer.registerPlugin(UniverSheetsFormulaUIPlugin);
        univer.registerPlugin(UniverSheetsUIPlugin);

        univerRef.current = univer;

        const summaryHeaderRow1 = TABLE_DATA_START_ROW + daysInMonth + 1;
        const summaryHeaderRow2 = summaryHeaderRow1 + 2;
        const summaryValuesRow1 = summaryHeaderRow1 + 1;
        const summaryValuesRow2 = summaryHeaderRow2 + 1;
        const rowCount = Math.max(summaryValuesRow2 + 2, 30);
        const columnCount = Math.max(12, SUMMARY_HEADERS.length + 1);

        const borderCell = {
            bd: makeBorder(),
            ff: 'Sofia Sans',
            fs: 10,
            ht: 2,
            vt: 2,
        };
        const tableHeaderStyle = {
            ...borderCell,
            fw: 1,
            tb: 3,
            h: 60,
            bg: { rgb: HEADER_BG },
        };

        const tableSummaryHeaderStyle = {
            ...borderCell,
            fw: 1,
            tb: 3,
            h: 100,
            bl: 1,
            bg: { rgb: HEADER_BG },
        };
        const summaryValueStyle = { ...borderCell, fw: 1 };

        const mergeData = [
            { startRow: TITLE_ROW, endRow: TITLE_ROW, startColumn: 0, endColumn: 5 },
            { startRow: SUBTITLE_NAME_ROW, endRow: SUBTITLE_NAME_ROW, startColumn: 0, endColumn: 5 },
            { startRow: SUBTITLE_PERIOD_ROW, endRow: SUBTITLE_PERIOD_ROW, startColumn: 0, endColumn: 2 },
            { startRow: summaryHeaderRow1, endRow: summaryHeaderRow2 - 1, startColumn: 0, endColumn: 0 },
        ];

        const sheetData: Record<number, Record<number, any>> = {
            [TITLE_ROW]: {
                0: {
                    v: 'ЛИЧНА СМЕТКА',
                    s: { ff: 'Sofia Sans', fs: 22, fw: 1, ht: 2, vt: 2, tb: 2, bl: 1 },
                },

            },
            [SUBTITLE_NAME_ROW]: {
                0: {
                    v: `на ${String(record?.employee_name ?? '').toUpperCase()} - МАШИНИСТ ПЖМ`,
                    s: { ff: 'Sofia Sans', fs: 13, ht: 2, vt: 2, bl: 1, },
                },
            },
            [SUBTITLE_PERIOD_ROW]: {
                0: {
                    v: `за месец ${BG_MONTH_NAMES[safeMonth] || String(safeMonth)} ${safeYear} год.`,
                    s: { ff: 'Sofia Sans', fs: 13, ht: 2, vt: 2, bl: 1 },
                },
            },
            [TABLE_HEADER_ROW]: {},
        };

        COLUMNS.forEach((label, col) => {
            sheetData[TABLE_HEADER_ROW][col] = { v: label, s: tableHeaderStyle };
        });

        dayRows.forEach((row: any, index: number) => {
            const day = index + 1;
            const r = TABLE_DATA_START_ROW + index;
            const style = isHolidayLikeDay(day)
                ? { ...borderCell, bg: { rgb: HOLIDAY_BG } }
                : borderCell;

            sheetData[r] = {
                0: { v: day, s: style },
                1: { v: row?.shift || '', s: style },
                2: { v: row?.worked_time || '', s: style },
                3: { v: row?.night_work || '', s: style },
                4: { v: String(row?.kilometers ?? ''), s: style },
                5: { v: String(row?.protocol_dpk ?? ''), s: style },
            };
        });

        // Header 1 + Data 1
        sheetData[summaryHeaderRow1] = {
            0: { v: 'Обобщени стойности', s: tableSummaryHeaderStyle },
        };
        SUMMARY_HEADERS_ROW_1.forEach((label, index) => {
            sheetData[summaryHeaderRow1][index + 1] = { v: label, s: tableSummaryHeaderStyle };
        });
        sheetData[summaryValuesRow1] = { 0: { v: '', s: summaryValueStyle } };
        const zeroTimeMinutes = Number.isFinite(Number(record?.zero_time_minutes))
            ? Number(record?.zero_time_minutes)
            : null;
        const summaryValues = [
            formatMinutesToHHMM(record?.individual_norm_minutes ?? 0),
            formatMinutesToHHMM(record?.worked_time_minutes ?? 0),
            formatMinutesToHHMM(record?.night_work_minutes ?? 0),
            formatMinutesToHHMM(record?.night_correction_1143_minutes ?? 0),
            formatDecimalBg(record?.kilometers_total ?? 0),
            formatMinutesToHHMM(record?.worked_with_correction_minutes ?? 0),
            zeroTimeMinutes === null ? '-' : formatMinutesToHHMM(zeroTimeMinutes),
            formatDecimalBg(record?.night_work_x24 ?? 0),
            formatMinutesToHHMM(record?.previous_month_balance_minutes ?? 0),
            formatMinutesToHHMM(record?.current_month_balance_minutes ?? 0),
            formatMinutesToHHMM(record?.period_total_minutes ?? 0),
        ];
        // Данни 1
        summaryValues.slice(0, SUMMARY_HEADERS_ROW_1.length).forEach((value, index) => {
            sheetData[summaryValuesRow1][index + 1] = { v: value, s: summaryValueStyle };
        });
        // Header 2
        sheetData[summaryHeaderRow2] = { 0: { v: '', s: tableSummaryHeaderStyle } };
        SUMMARY_HEADERS_ROW_2.forEach((label, index) => {
            sheetData[summaryHeaderRow2][index] = { v: label, s: tableSummaryHeaderStyle };
        });
        // Данни 2
        sheetData[summaryValuesRow2] = { 0: { v: '', s: summaryValueStyle } };
        summaryValues.slice(SUMMARY_HEADERS_ROW_1.length).forEach((value, index) => {
            sheetData[summaryValuesRow2][index] = { v: value, s: summaryValueStyle };
        });

        const columnData: Record<number, { w: number }> = {
            0: { w: 80 },
            1: { w: 86 },
            2: { w: 86 },
            3: { w: 86 },
            4: { w: 82 },
            5: { w: 86 },
        };

        for (let col = 6; col < columnCount; col += 1) {
            columnData[col] = { w: 88 };
        }

        const wb = univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
            id: `personal-account-${record.id}`,
            appVersion: '3.0.0',
            locale: LocaleType.EN_US,
            styles: {},
            sheets: {
                'sheet-1': {
                    id: 'sheet-1',
                    name: 'Лична сметка',
                    rowCount,
                    columnCount,
                    cellData: sheetData,
                    mergeData,
                    rowData: {
                        [TITLE_ROW]: { h: 60 },
                        [SUBTITLE_NAME_ROW]: { h: 40 },
                        [SUBTITLE_PERIOD_ROW]: { h: 30 },
                        [TABLE_HEADER_ROW]: { h: 60 },
                        [summaryHeaderRow1]: { h: 50 },
                        [summaryHeaderRow2]: { h: 50 },
                    },
                    columnData,
                },
            },
            sheetOrder: ['sheet-1'],
        });

        workbookRef.current = wb;
        requiredRelationsRef.current = buildRequiredRelationsPayload(record);

        const commandService = (univer as any).__getInjector?.()?.get?.(ICommandService);

        {
            const initialSheet = wb.getActiveSheet();
            const { signature, total } = computeKmSignatureAndTotal(initialSheet, daysInMonth);
            lastKmSignatureRef.current = signature;
            void setSummaryKmTotalIfChanged(commandService, wb, initialSheet, summaryValuesRow1, total);
        }

        window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 80);

        lastSerializedRowsRef.current = JSON.stringify(captureRowsFromSheet());

        commandService?.onCommandExecuted?.((_command: any) => {

            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }

            autosaveTimerRef.current = setTimeout(() => {
                void persistRows(true);
            }, 1200);
        });

        liveSyncTimerRef.current = setInterval(() => {
            const sheet = workbookRef.current?.getActiveSheet?.();
            const workbook = workbookRef.current;
            if (!sheet || !workbook) {
                return;
            }

            const { signature, total } = computeKmSignatureAndTotal(sheet, daysInMonth);
            if (signature === lastKmSignatureRef.current) {
                return;
            }

            lastKmSignatureRef.current = signature;
            void setSummaryKmTotalIfChanged(commandService, workbook, sheet, summaryValuesRow1, total);
        }, 250);

        setLoading(false);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }

            if (liveSyncTimerRef.current) {
                clearInterval(liveSyncTimerRef.current);
                liveSyncTimerRef.current = null;
            }

            try {
                univer.dispose();
            } catch {
                // no-op
            }

            univerRef.current = null;
            workbookRef.current = null;
        };
    }, [record?.id, safeMonth, safeYear]);

    // Линк назад към списъка
    const monthName = BG_MONTH_NAMES[safeMonth] || String(safeMonth);
    const backUrl = `/admin#/personal-accounts-period/${safeYear}/${safeMonth}/`;

    return (
        <Box sx={{ width: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Подробни данни</Typography>
                <Button variant="outlined" href={backUrl}>Назад към личните сметки за м.{monthName}</Button>
                <Button variant="contained" onClick={() => void persistRows(false)} disabled={saving || loading}>
                    {saving ? 'Запис...' : 'Запиши'}
                </Button>
            </Box>

            {autosaveActive && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Автозапис...
                </Typography>
            )}

            {loading && (
                <Box display="flex" justifyContent="center" my={3}>
                    <CircularProgress size={28} />
                </Box>
            )}

            <Box
                sx={{
                    mt: 0,
                    height: 'calc(100vh - 220px)',
                    minHeight: 620,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    ref={containerRef}
                    style={{
                        flex: 1,
                        minHeight: 620,
                        width: '100%',
                        border: '1px solid #ddd',
                        background: '#fff',
                    }}
                />
            </Box>
        </Box>
    );
};
