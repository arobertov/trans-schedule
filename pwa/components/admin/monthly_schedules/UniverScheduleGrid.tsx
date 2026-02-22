import React, { useEffect, useRef, useState } from 'react';
import { useDataProvider, useNotify, useRecordContext, useUpdate } from 'react-admin';
import { Box, Button, TextField, Typography, Select, MenuItem, InputLabel, FormControl, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { Fullscreen, FullscreenExit, Delete as DeleteIcon, PersonAdd } from '@mui/icons-material';
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import { Univer, LocaleType, UniverInstanceType, ICommandService, IUniverInstanceService, merge } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverSheetsPlugin, SetRangeValuesCommand } from '@univerjs/sheets';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';

import UniverDesignEnUS from "@univerjs/design/locale/en-US";
import UniverDocsUIEnUS from "@univerjs/docs-ui/locale/en-US";
import UniverSheetsFormulaUIEnUS from "@univerjs/sheets-formula-ui/locale/en-US";
import UniverSheetsUIEnUS from "@univerjs/sheets-ui/locale/en-US";
import UniverUIEnUS from "@univerjs/ui/locale/en-US";

const SCHEDULE_TEMPLATE = {
    header: {
        bg: { rgb: '#f0f0f0' },
        ht: 2, 
        vt: 2, 
        ff: 'Sofia Sans',
        bd: { 
            t: { style: 1, color: { rgb: '#ccc' } }, 
            b: { style: 1, color: { rgb: '#ccc' } }, 
            l: { style: 1, color: { rgb: '#ccc' } }, 
            r: { style: 1, color: { rgb: '#ccc' } } 
        },
        fw: 1, 
    },
    employeeName: {
        vt: 2,
        fw: 1,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#e0e0e0' } },
            r: { style: 1, color: { rgb: '#e0e0e0' } }
        }
    },
    description: {
         vt: 2,
         fs: 10,
         ff: 'Sofia Sans',
         bd: {
             b: { style: 1, color: { rgb: '#e0e0e0' } },
             r: { style: 1, color: { rgb: '#e0e0e0' } }
         },
         cl: { rgb: '#0a0a0a' }
    },
    matrixCell: {
        ht: 2,
        vt: 2,
        fs: 9,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } },
            l: { style: 1, color: { rgb: '#f0f0f0' } }
        },
        cl: { rgb: '#888' }
    },
    normalCell: {
        ht: 2, // Center
        vt: 2,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } }
        }
    },
    weekendCell: {
        ht: 2,
        vt: 2,
        bg: { rgb: '#a7a7a7' },
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } }
        }
    },
    // New Left Table Styles
    leftTableHeader: {
        bg: { rgb: '#EEECE1' },
        ht: 2, 
        vt: 2, 
        ff: 'Sofia Sans',
        bd: { 
            t: { style: 1, color: { rgb: '#000' } }, 
            b: { style: 1, color: { rgb: '#000' } }, 
            l: { style: 1, color: { rgb: '#000' } }, 
            r: { style: 1, color: { rgb: '#000' } } 
        },
        fw: 1,
    },
    countCellPink: {
        bg: { rgb: '#ffdbcc' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    countCellGreen: {
        bg: { rgb: '#09ec09' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    countCellRed: {
        bg: { rgb: '#aa0a0a' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    matrixInputCell: {
         ht: 2, vt: 2, ff: 'Sofia Sans',
         bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
        periodInputSingle: {
            bg: { rgb: '#E8F5E9' },
            ht: 2, vt: 2, ff: 'Sofia Sans',
            bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
        },
        periodInputDuplicate: {
            bg: { rgb: '#FFEBEE' },
            ht: 2, vt: 2, ff: 'Sofia Sans',
            bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
        },
    // New Document Styles
    title: {
        fs: 18,
        fw: 1,
        ff: 'Sofia Sans',
        ht: 2, // Center
        vt: 2,
    },
    subTitle: {
        fs: 11,
        ff: 'Sofia Sans',
        ht: 3, // Right
        vt: 2,
        cl: { rgb: '#000' }
    },
    legend: {
        fs: 10,
        ff: 'Sofia Sans',
        ht: 1, // Left
        vt: 2,
        cl: { rgb: '#666' }
    },
    footerLabel: {
         fs: 11,
         ff: 'Sofia Sans',
         vt: 2,
         ht: 1,
         pt: 20 
    }
};

const GRID_ROW_OFFSET = 5; // Rows reserved for header info (0-4)
const PJM_POSITION_NAME = 'машинист пжм';
const MATRIX_COLORS_STORAGE_KEY = 'monthlySchedule.matrixValidationColors';
const AUTO_SAVE_DEBOUNCE_MS = 900;
const MATRIX_COLOR_DEFAULTS = {
    single: '#E8F5E9',
    duplicate: '#FFEBEE',
    weekend: '#A7A7A7',
};


export const UniverScheduleGrid = () => {
    const record = useRecordContext();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<Univer | null>(null);
    const workbookRef = useRef<any>(null);
    
    // State
    const [periods, setPeriods] = useState({
        p1End: 10,
        p2End: 20
        // P3 is rest of month
    });
    
    const [patterns, setPatterns] = useState<any[]>([]);
    const [matrixData, setMatrixData] = useState<any[]>([]);
    const [selectedMatrixId, setSelectedMatrixId] = useState<string>('');
    const [update] = useUpdate();
    const [loadedEmployees, setLoadedEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
    const [calendarStats, setCalendarStats] = useState<{ workDays: number, workHours: number } | null>(null);
    const [showMatrixConfig, setShowMatrixConfig] = useState(true);
    const [matrixValidationColors, setMatrixValidationColors] = useState(() => {
        if (typeof window === 'undefined') return MATRIX_COLOR_DEFAULTS;
        try {
            const raw = window.localStorage.getItem(MATRIX_COLORS_STORAGE_KEY);
            if (!raw) return MATRIX_COLOR_DEFAULTS;

            const parsed = JSON.parse(raw);
            return {
                single: parsed?.single || MATRIX_COLOR_DEFAULTS.single,
                duplicate: parsed?.duplicate || MATRIX_COLOR_DEFAULTS.duplicate,
                weekend: parsed?.weekend || MATRIX_COLOR_DEFAULTS.weekend,
            };
        } catch {
            return MATRIX_COLOR_DEFAULTS;
        }
    });

    const tempRowsRef = useRef<any[] | null>(null);
    const [renderTrigger, setRenderTrigger] = useState(0);

    // Manage Employees Dialog State
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    const [selectedEmp, setSelectedEmp] = useState<any>(null);

    // Refs for accessing state inside Univer listeners
    const periodsRef = useRef(periods);
    const matrixDataRef = useRef(matrixData);
    const selectedMatrixIdRef = useRef(selectedMatrixId);
    const isApplyingPeriodStylesRef = useRef(false);
    const showMatrixConfigRef = useRef(showMatrixConfig);
    const loadedEmployeesRef = useRef(loadedEmployees);
    const matrixValidationColorsRef = useRef(matrixValidationColors);
    const colorApplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canUseSetRangeCommandRef = useRef<boolean | null>(null);
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSaveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const hasPendingAutoSaveRef = useRef(false);

    useEffect(() => { periodsRef.current = periods; }, [periods]);
    useEffect(() => { matrixDataRef.current = matrixData; }, [matrixData]);
    useEffect(() => { selectedMatrixIdRef.current = selectedMatrixId; }, [selectedMatrixId]);
    useEffect(() => { showMatrixConfigRef.current = showMatrixConfig; }, [showMatrixConfig]);
    useEffect(() => { loadedEmployeesRef.current = loadedEmployees; }, [loadedEmployees]);
    useEffect(() => { matrixValidationColorsRef.current = matrixValidationColors; }, [matrixValidationColors]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(MATRIX_COLORS_STORAGE_KEY, JSON.stringify(matrixValidationColors));
        } catch {}
    }, [matrixValidationColors]);

    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
                autoSaveTimeoutRef.current = null;
            }

            if (autoSaveStatusTimeoutRef.current) {
                clearTimeout(autoSaveStatusTimeoutRef.current);
                autoSaveStatusTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (autoSaveStatusTimeoutRef.current) {
            clearTimeout(autoSaveStatusTimeoutRef.current);
            autoSaveStatusTimeoutRef.current = null;
        }

        if (autoSaveStatus === 'saved' || autoSaveStatus === 'error') {
            autoSaveStatusTimeoutRef.current = setTimeout(() => {
                setAutoSaveStatus('idle');
            }, 2500);
        }

        return () => {
            if (autoSaveStatusTimeoutRef.current) {
                clearTimeout(autoSaveStatusTimeoutRef.current);
                autoSaveStatusTimeoutRef.current = null;
            }
        };
    }, [autoSaveStatus]);

    const getValidationMatrixStyle = (colorHex: string) => ({
        ...SCHEDULE_TEMPLATE.matrixInputCell,
        bg: { rgb: colorHex }
    });

    const getWeekendCellStyle = (colorHex: string) => ({
        ...SCHEDULE_TEMPLATE.weekendCell,
        bg: { rgb: colorHex }
    });

    const getGlobalColumnConflictSummary = (sheet: any, lastEmployeeRow: number) => {
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

    const hasAnyGlobalColumnConflict = (summary: {
        globalVsP1: Set<string>;
        globalVsP2: Set<string>;
        globalVsP3: Set<string>;
    }) => summary.globalVsP1.size > 0 || summary.globalVsP2.size > 0 || summary.globalVsP3.size > 0;

    const buildGlobalConflictMessage = (summary: {
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
        if (canUseSetRangeCommandRef.current !== false) {
            try {
                await commandService.executeCommand(SetRangeValuesCommand.id, {
                    unitId,
                    subUnitId,
                    range: { startRow: row, startColumn: column, endRow: row, endColumn: column },
                    value: style !== undefined ? { v: value, s: style } : { v: value }
                });
                canUseSetRangeCommandRef.current = true;
                return;
            } catch (err: any) {
                const message = String(err?.message ?? err ?? '');
                if (message.includes('not registered')) {
                    canUseSetRangeCommandRef.current = false;
                } else {
                    console.warn('SetRangeValuesCommand failed, applying direct cell fallback.', err);
                }
            }
        }

        try {
            const currentCell = sheet?.getCell?.(row, column) ?? {};
            const nextCell = { ...(currentCell || {}) };

            if (value !== undefined) nextCell.v = value;
            if (style !== undefined) nextCell.s = style;

            if (typeof sheet?.setCell === 'function') {
                sheet.setCell(row, column, nextCell);
                return;
            }

            if (currentCell && typeof currentCell === 'object') {
                if (value !== undefined) currentCell.v = value;
                if (style !== undefined) currentCell.s = style;
            }
        } catch (fallbackErr) {
            console.warn('Direct cell fallback failed.', fallbackErr);
        }
    };

    const applyMatrixFrequencyStyles = async (
        commandService: any,
        unitId: string,
        subUnitId: string,
        sheet: any,
        lastEmployeeRow: number,
        matrixColumns: number[] = [0, 1, 2, 3]
    ) => {
        const globalConflictSummary = getGlobalColumnConflictSummary(sheet, lastEmployeeRow);

        for (const col of matrixColumns) {
            const counts = new Map<string, number>();

            for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
                const raw = String(sheet.getCell(r, col)?.v ?? '').trim();
                if (raw) {
                    counts.set(raw, (counts.get(raw) || 0) + 1);
                }
            }

            for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
                const currentValue = sheet.getCell(r, col)?.v ?? '';
                const key = String(currentValue ?? '').trim();

                const globalConflict = key
                    ? (col === 0
                        ? globalConflictSummary.p1Values.has(key)
                            || globalConflictSummary.p2Values.has(key)
                            || globalConflictSummary.p3Values.has(key)
                        : globalConflictSummary.globalValues.has(key))
                    : false;

                let style = SCHEDULE_TEMPLATE.matrixInputCell;
                if (key) {
                    const freq = counts.get(key) || 0;
                    style = freq === 1 && !globalConflict
                        ? getValidationMatrixStyle(matrixValidationColorsRef.current.single)
                        : getValidationMatrixStyle(matrixValidationColorsRef.current.duplicate);
                }

                await setCellValueSafely(commandService, unitId, subUnitId, sheet, r, col, currentValue, style);
            }
        }
    };

    const applyWeekendStyles = async (
        commandService: any,
        unitId: string,
        subUnitId: string,
        sheet: any,
        lastEmployeeRow: number,
        firstDayCol: number,
        daysInMonth: number,
        year: number,
        month: number
    ) => {
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (!isWeekend) continue;

            const c = firstDayCol + d - 1;
            for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
                const cell = sheet.getCell(r, c);
                const currentValue = cell?.v ?? '';
                let style = cell?.s;

                if (typeof style === 'string' && workbookRef.current) {
                    try {
                        const styles = workbookRef.current.getStyles();
                        if (styles) style = styles.get(style);
                    } catch (e) {}
                }

                const mergedStyle = {
                    ...(style || SCHEDULE_TEMPLATE.normalCell),
                    bg: { rgb: matrixValidationColorsRef.current.weekend }
                };

                await setCellValueSafely(commandService, unitId, subUnitId, sheet, r, c, currentValue, mergedStyle);
            }
        }
    };

    const getEmployeeDisplayName = (emp: any) => {
        if (emp?.fullName) return String(emp.fullName).trim();
        return [emp?.first_name, emp?.middle_name, emp?.last_name].filter(Boolean).join(' ').trim();
    };

    const sortEmployeesByName = (employees: any[]) => {
        return [...employees].sort((a, b) => getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), 'bg', { sensitivity: 'base' }));
    };

    const getPositionColumnWidth = (positionName: string) => {
        const text = String(positionName ?? '').trim();
        const estimated = Math.max(120, Math.ceil(text.length * 8.5) + 24);
        return Math.min(estimated, 420);
    };

    const getNameColumnWidth = (employees: any[]) => {
        const longestNameLength = employees.reduce((max, emp) => {
            const nameLength = getEmployeeDisplayName(emp).length;
            return Math.max(max, nameLength);
        }, 24);

        const estimated = Math.max(250, Math.ceil(longestNameLength * 8.5) + 28);
        return Math.min(estimated, 560);
    };

    const isPjmPositionName = (name: any) => String(name ?? '').trim().toLowerCase() === PJM_POSITION_NAME;

    useEffect(() => {
        const positionName = typeof record?.position === 'object' ? record.position?.name : '';
        if (positionName) {
            setShowMatrixConfig(isPjmPositionName(positionName));
        }
    }, [record?.id, record?.position]);

    const resolveMatrixRowByNumber = (matrixRows: any[] | null, rawValue: any) => {
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

    useEffect(() => {
        if (!record || !record.year || !record.month) return;
        
        dataProvider.getList('calendars', {
            filter: { year: record.year },
            pagination: { page: 1, perPage: 1 },
            sort: { field: 'year', order: 'DESC' }
        })
        .then(({ data }) => {
            if (data && data.length > 0 && data[0].monthsData) {
                const monthInfo = data[0].monthsData[record.month];
                if (monthInfo) {
                    setCalendarStats({
                        workDays: monthInfo.workDays || 0,
                        workHours: monthInfo.workHours || 0
                    });
                }
            }
        })
        .catch(err => console.error("Failed to fetch calendar", err));
    }, [dataProvider, record?.year, record?.month]);

    useEffect(() => {
        if (!record || !record.year || !record.month) return;
        
        let isMounted = true;
        dataProvider.getList('matrices', { 
            filter: { year: record.year, month: record.month },
            pagination: { page: 1, perPage: 100 },
            sort: { field: 'id', order: 'DESC' }
        })
        .then(({ data }) => {
            if (isMounted) {
                setMatrixData(data);
                if (data.length > 0) {
                    setSelectedMatrixId(String(data[0].id));
                }
            }
        })
        .catch(e => console.log("No matrix found", e));

        return () => { isMounted = false; };
    }, [dataProvider, record?.year, record?.month]);
    
    useEffect(() => {
        let isMounted = true;
        dataProvider.getList('order_patterns', { 
            pagination: { page: 1, perPage: 100 },
            sort: { field: 'name', order: 'ASC' }
        })
        .then(({ data }) => {
            if (isMounted) {
                setPatterns(data);
            }
        })
        .catch(console.error);

        return () => { isMounted = false; };
    }, [dataProvider]);

    // Init Univer & Load Data
    useEffect(() => {
        if (!containerRef.current || !record) return;
        setIsLoading(true);
        
        // Prevent double initialization
        if (univerRef.current) return;

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
        univer.registerPlugin(UniverSheetsUIPlugin);
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        univer.registerPlugin(UniverSheetsFormulaUIPlugin);

        univerRef.current = univer;

        // Validation Listener: Update Count (Col 0) when Global (Col 1) changes
        const injector = (univer as any).__getInjector();
        const commandService = injector.get(ICommandService);
        const univerInstanceService = injector.get(IUniverInstanceService);

        commandService.onCommandExecuted(async (command: any) => {
            const params = command?.params;
            const range = params?.range;

            if (!range || !params?.unitId || !params?.subUnitId) return;
            if (isApplyingPeriodStylesRef.current) return;

            const wb = univerInstanceService.getUnit(params.unitId);
            const sheet = wb?.getSheetBySheetId(params.subUnitId);
            if (!sheet) return;

            scheduleAutoSave();

                const isMatrixMode = showMatrixConfigRef.current;
                if (!isMatrixMode) return;
                const employeeRowsCount = loadedEmployeesRef.current.length;
                const lastEmployeeRow = GRID_ROW_OFFSET + employeeRowsCount - 1;
                if (employeeRowsCount <= 0) return;

                // 2. React if update touches Global/P1/P2/P3 (Cols 0-3) - Update frequency colors per column
                if (range.startColumn <= 3 && range.endColumn >= 0) {
                    isApplyingPeriodStylesRef.current = true;
                    try {
                        await applyMatrixFrequencyStyles(commandService, params.unitId, params.subUnitId, sheet, lastEmployeeRow, [0, 1, 2, 3]);
                    } finally {
                        isApplyingPeriodStylesRef.current = false;
                    }
                }

                // 3. Auto-fill schedule if update touches Matrix Inputs (Cols 0-3)
                if (range.endColumn >= 0 && range.startColumn <= 3) {
                    const currentMatrixData = matrixDataRef.current;
                    const currentMatrixId = selectedMatrixIdRef.current;
                    const currentPeriods = periodsRef.current;
                    const invalidMatrixRefs = new Set<string>();

                    const selectedMatrix = currentMatrixData.find(m => String(m.id) === currentMatrixId);
                    const matrixRows = selectedMatrix ? (selectedMatrix.rows || []) : null;
                    const firstDayCol = 8;
                    const days = sheet.getColumnCount() - firstDayCol;

                    // Helper to get letter from multiple sources or calculate
                    const getValForDay = (day: number, startPos: any, sheetRowIndex: number) => {
                        const normalized = String(startPos ?? '').trim();
                        if (!normalized) return '';

                        const startPosFunc = Number(normalized);

                         if (matrixRows) {
                              const { targetRow, invalidReason } = resolveMatrixRowByNumber(matrixRows, startPos);
                              if (invalidReason) {
                                  invalidMatrixRefs.add(`служител ${sheetRowIndex}: ${invalidReason}`);
                                  return '';
                              }

                              if (targetRow && targetRow.cells && targetRow.cells[day - 1]) {
                                  return targetRow.cells[day - 1].value || '';
                              }
                         } else {
                            const cycle = ['Д', 'Н', ' ', ' '];
                            return cycle[(startPosFunc + day - 2) % 4];
                         }
                         return '';
                    };

                    const startRow = Math.max(range.startRow, GRID_ROW_OFFSET);
                    const endRow = Math.min(range.endRow, lastEmployeeRow);

                    for(let r = startRow; r <= endRow; r++) {

                        const globalVal = sheet.getCell(r, 0)?.v;
                        const p1Val = sheet.getCell(r, 1)?.v;
                        const p2Val = sheet.getCell(r, 2)?.v;
                        const p3Val = sheet.getCell(r, 3)?.v;

                        if (globalVal || p1Val || p2Val || p3Val) {
                            for(let d=1; d<=days; d++) {
                                let startPosToUse = globalVal;
                                if (d <= currentPeriods.p1End && p1Val) startPosToUse = p1Val;
                                else if (d > currentPeriods.p1End && d <= currentPeriods.p2End && p2Val) startPosToUse = p2Val;
                                else if (d > currentPeriods.p2End && p3Val) startPosToUse = p3Val;

                                const hasMatrixInput = String(startPosToUse ?? '').trim() !== '';
                                if (hasMatrixInput) {
                                    const val = getValForDay(d, startPosToUse, r - GRID_ROW_OFFSET + 1);
                                    // Removed check "if (val)" to ensure empty values overwrite existing cells
                                    const c = firstDayCol + d - 1;
                                    await setCellValueSafely(commandService, params.unitId, params.subUnitId, sheet, r, c, val);
                                }
                            }
                        }
                    }

                    if (invalidMatrixRefs.size > 0) {
                        const preview = Array.from(invalidMatrixRefs).slice(0, 3).join('; ');
                        notify(`Има невалидни стойности в номер на ред: ${preview}`, { type: 'warning' });
                    }

                    const globalConflictSummary = getGlobalColumnConflictSummary(sheet, lastEmployeeRow);
                    if (hasAnyGlobalColumnConflict(globalConflictSummary)) {
                        notify(`Конфликт между колони (Global и P1/P2/P3): ${buildGlobalConflictMessage(globalConflictSummary)}`, { type: 'warning' });
                    }
                }
        });

        // Cleanup function for THIS specific useEffect execution
        // This ensures proper cleanup whenever dependencies change or component unmounts
        // We do strictly sync dispose so React is happy
        const cleanupUniver = () => {
             if (univerRef.current) {
                univerRef.current.dispose();
                univerRef.current = null;
            }
        };

        const initData = async () => {
             // ... data fetching implementation remains same ...
             // We need to check if unmounted inside async calls
        };

        // Existing async logic...
        let isMounted = true; 
        
        (async () => {
            // Fetch Employees
            let employees: any[] = [];
            let positionName = 'Unknown';
            const positionId = typeof record.position === 'object' ? record.position.id : record.position;
            
            try {
                // Fetch Position Name
                if (record.position && record.position.name) {
                    positionName = record.position.name;
                } else if (positionId) {
                    try {
                        const { data: posData } = await dataProvider.getOne('positions', { id: positionId });
                        if (isMounted && posData) {
                            positionName = posData.name;
                        }
                    } catch (err) {
                        console.warn('Failed to fetch position details', err);
                    }
                }

                if (isMounted) {
                    const savedRows = tempRowsRef.current || record.schedule_rows || [];
                    const hasSavedData = savedRows.length > 0;
                    
                    if (hasSavedData) {
                        // Priority 1: Load from saved rows (Snapshot)
                        // Extract unique employees from saved rows to preserve order and existence
                        const savedEmployees: any[] = [];
                        const idsToFetch: any[] = [];

                        for (const row of savedRows) {
                            if (!row.employee_id) continue;
                            
                            // Check if we already have this employee in our list (duplicates in rows?)
                            // Usually 1 row per employee, but safeguard
                            if (savedEmployees.find(e => e.id === row.employee_id)) continue;

                            if (row.employee_name) {
                                // Fast path: We have the name snapshot
                                savedEmployees.push({
                                    id: row.employee_id,
                                    fullName: row.employee_name
                                    // We don't strictly need first/last name if we have fullName for display
                                });
                            } else {
                                // Legacy path: structure exists but no name saved. Need to fetch.
                                idsToFetch.push(row.employee_id);
                            }
                        }

                        if (idsToFetch.length > 0) {
                            // Fetch missing details
                             // Note: API Platform doesn't standardly support "ids" filter array in all configs, 
                             // but we can try to fetch all active for position and match, 
                             // OR fetch individually if count is small.
                             // Safest is to fetch all for position (cached likely) and filter.
                             // Or use getMany if we are sure IDs exist.
                             try {
                                 // Fetch all for position to be safe with filters
                                 const { data: allPosEmployees } = await dataProvider.getList('employees', {
                                    filter: { position: positionId }, // Don't filter by status=active, they might be inactive now!
                                    pagination: { page: 1, perPage: 1000 }
                                 });
                                 
                                 const empMap = new Map(allPosEmployees.map((e: any) => [e.id, e]));
                                 
                                 // Reconstruct list preserving order of savedRows
                                 // Mix of fully saved and fetched
                                 const finalEmployees: any[] = [];
                                 const processedIds = new Set();

                                 for (const row of savedRows) {
                                     if (!row.employee_id || processedIds.has(row.employee_id)) continue;
                                     processedIds.add(row.employee_id);

                                     if (row.employee_name) {
                                         finalEmployees.push({ id: row.employee_id, fullName: row.employee_name });
                                     } else {
                                         const fetched = empMap.get(row.employee_id);
                                         if (fetched) {
                                             finalEmployees.push(fetched);
                                         } else {
                                             // Employee might be deleted from DB entirely. 
                                             // Fallback to "Unknown ID" or just ID
                                             finalEmployees.push({ 
                                                 id: row.employee_id, 
                                                 fullName: `Deleted User #${row.employee_id}`,
                                                 first_name: 'Deleted',
                                                 last_name: '#' + row.employee_id
                                             });
                                         }
                                     }
                                 }
                                 employees = finalEmployees;

                             } catch(err) {
                                 console.error("Failed to fetch legacy employee details", err);
                                 // Fallback to just IDs?
                                 employees = savedEmployees; // partial
                             }
                        } else {
                            employees = savedEmployees;
                        }

                    } else {
                        // Priority 2: New Schedule - Load all Active Employees
                        const { data } = await dataProvider.getList('employees', {
                            filter: { position: positionId, status: 'активен' },
                            pagination: { page: 1, perPage: 1000 },
                            sort: { field: 'id', order: 'ASC' }
                        });
                        employees = data;
                    }
                    
                    employees = sortEmployeesByName(employees);
                    setLoadedEmployees(employees);
                }
            } catch(e) { console.error(e); }

            // Ensure Univer is still available and component mounted
            if (!isMounted || !univerRef.current) return;

            const year = record.year;
            const month = record.month; 
            const daysInMonth = new Date(year, month, 0).getDate();
            const isMatrixMode = isPjmPositionName(positionName);
            setShowMatrixConfig(isMatrixMode);
            const firstDayCol = isMatrixMode ? 8 : 3;
            const positionColumnWidth = getPositionColumnWidth(positionName);
            const nameColumnWidth = getNameColumnWidth(employees);

            // Structure:
            // Matrix mode:
            // 0: Global, 1: P1, 2: P2, 3: P3, 4: Spacer, 5: No, 6: Name, 7: Position, 8..: Days
            // Non-matrix mode:
            // 0: No, 1: Name, 2: Position, 3..: Days
            const headers = isMatrixMode
                ? ['Global', 'P1', 'P2', 'P3', '', '№', 'Служител', 'Длъжност']
                : ['№', 'Служител', 'Длъжност'];
            for(let i=1; i<=daysInMonth; i++) headers.push(String(i));
            const totalCols = headers.length;

            const sheetData: any = {};
            const mergeData: any[] = [];

            // --- HEADER REGION (Rows 0-4) ---
            
            // Row 0: Title (Spans whole width)
            const monthName = new Date(year, month - 1).toLocaleString('bg-BG', { month: 'long' }).toUpperCase();
            const titleText = `ГРАФИК ЗА РАБОТА НА ${positionName.toUpperCase()} ЗА МЕСЕЦ ${monthName} ${year} Г.`;
            sheetData[0] = { 
                0: { v: titleText, s: SCHEDULE_TEMPLATE.title } 
            };
            mergeData.push({ startRow: 0, endRow: 0, startColumn: 0, endColumn: totalCols - 1 });

            // Row 1: Approved By
            sheetData[1] = { 
                [totalCols - 5]: { v: "Утвърдил: ............................", s: SCHEDULE_TEMPLATE.subTitle }
            };
            mergeData.push({ startRow: 1, endRow: 1, startColumn: totalCols - 5, endColumn: totalCols - 1 });

            if (isMatrixMode) {
                // Row 2: "Add row matrix" (Left)
                sheetData[2] = {
                    0: { v: 'Добави ред от матрица', s: SCHEDULE_TEMPLATE.leftTableHeader }
                };
                mergeData.push({ startRow: 2, endRow: 2, startColumn: 0, endColumn: 3});

                // Row 3: "Whole month" / "Periods" (Left)
                sheetData[3] = {};
                sheetData[3][0] = { v: 'Цял месец', s: SCHEDULE_TEMPLATE.leftTableHeader };
                sheetData[3][1] = { v: 'Периоди:', s: SCHEDULE_TEMPLATE.leftTableHeader };
                mergeData.push({ startRow: 3, endRow: 3, startColumn: 1, endColumn: 3 });
            }

            // Row 4: Grid Headers
            const headerRowIdx = GRID_ROW_OFFSET - 1; // 4
            sheetData[headerRowIdx] = isMatrixMode
                ? {
                    0: { v: 'Ред №', s: { ...SCHEDULE_TEMPLATE.leftTableHeader, fill: { rgb: '#ccc' } } },
                    1: { v: 'I', s: SCHEDULE_TEMPLATE.leftTableHeader },
                    2: { v: 'II', s: SCHEDULE_TEMPLATE.leftTableHeader },
                    3: { v: 'III', s: SCHEDULE_TEMPLATE.leftTableHeader },
                    5: { v: '№', s: SCHEDULE_TEMPLATE.header },
                    6: { v: 'Име, Презиме, Фамилия', s: SCHEDULE_TEMPLATE.header },
                    7: { v: 'Длъжност', s: SCHEDULE_TEMPLATE.header },
                }
                : {
                    0: { v: '№', s: SCHEDULE_TEMPLATE.header },
                    1: { v: 'Име, Презиме, Фамилия', s: SCHEDULE_TEMPLATE.header },
                    2: { v: 'Длъжност', s: SCHEDULE_TEMPLATE.header },
                };
            
            for(let i=1; i<=daysInMonth; i++) {
                sheetData[headerRowIdx][firstDayCol - 1 + i] = { v: String(i), s: SCHEDULE_TEMPLATE.header };
            }

            // Calculation for Frequencies (Global/P1/P2/P3)
            const savedRows = record.schedule_rows || [];
            const globalCounts = new Map<string, number>();
            const p1Counts = new Map<string, number>();
            const p2Counts = new Map<string, number>();
            const p3Counts = new Map<string, number>();
            savedRows.forEach((r: any) => {
                if(r.matrix_global) {
                    const k = String(r.matrix_global).trim();
                    if (k) globalCounts.set(k, (globalCounts.get(k) || 0) + 1);
                }
                if (r.matrix_p1) {
                    const k = String(r.matrix_p1).trim();
                    if (k) p1Counts.set(k, (p1Counts.get(k) || 0) + 1);
                }
                if (r.matrix_p2) {
                    const k = String(r.matrix_p2).trim();
                    if (k) p2Counts.set(k, (p2Counts.get(k) || 0) + 1);
                }
                if (r.matrix_p3) {
                    const k = String(r.matrix_p3).trim();
                    if (k) p3Counts.set(k, (p3Counts.get(k) || 0) + 1);
                }
            });
            const globalValueSet = new Set<string>(Array.from(globalCounts.keys()));
            const p1ValueSet = new Set<string>(Array.from(p1Counts.keys()));
            const p2ValueSet = new Set<string>(Array.from(p2Counts.keys()));
            const p3ValueSet = new Set<string>(Array.from(p3Counts.keys()));

            // Rows
            employees.forEach((emp, index) => {
                const r = index + GRID_ROW_OFFSET; // Start after offset
                sheetData[r] = {};
                
                const existing = savedRows.find((sr: any) => sr.employee_id === emp.id);
                
                // --- LEFT TABLE DATA ---
                const mg = existing?.matrix_global || '';
                const mp1 = existing?.matrix_p1 || '';
                const mp2 = existing?.matrix_p2 || '';
                const mp3 = existing?.matrix_p3 || '';

                const mp1Key = String(mp1 ?? '').trim();
                const mp2Key = String(mp2 ?? '').trim();
                const mp3Key = String(mp3 ?? '').trim();
                const mgKey = String(mg ?? '').trim();
                const hasGlobalConflict = !!mgKey && (p1ValueSet.has(mgKey) || p2ValueSet.has(mgKey) || p3ValueSet.has(mgKey));

                const mgStyle = mgKey
                    ? ((globalCounts.get(mgKey) || 0) === 1 && !hasGlobalConflict
                        ? getValidationMatrixStyle(matrixValidationColors.single)
                        : getValidationMatrixStyle(matrixValidationColors.duplicate))
                    : SCHEDULE_TEMPLATE.matrixInputCell;

                const mp1Style = mp1Key
                    ? ((p1Counts.get(mp1Key) || 0) === 1 && !globalValueSet.has(mp1Key)
                        ? getValidationMatrixStyle(matrixValidationColors.single)
                        : getValidationMatrixStyle(matrixValidationColors.duplicate))
                    : SCHEDULE_TEMPLATE.matrixInputCell;
                const mp2Style = mp2Key
                    ? ((p2Counts.get(mp2Key) || 0) === 1 && !globalValueSet.has(mp2Key)
                        ? getValidationMatrixStyle(matrixValidationColors.single)
                        : getValidationMatrixStyle(matrixValidationColors.duplicate))
                    : SCHEDULE_TEMPLATE.matrixInputCell;
                const mp3Style = mp3Key
                    ? ((p3Counts.get(mp3Key) || 0) === 1 && !globalValueSet.has(mp3Key)
                        ? getValidationMatrixStyle(matrixValidationColors.single)
                        : getValidationMatrixStyle(matrixValidationColors.duplicate))
                    : SCHEDULE_TEMPLATE.matrixInputCell;

                const fullName = emp.fullName || [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ');
                const fullNameDisplay = `  ${fullName}`;
                const positionDisplay = `  ${positionName}`;

                if (isMatrixMode) {
                    sheetData[r][0] = { v: mg, s: mgStyle };
                    sheetData[r][1] = { v: mp1, s: mp1Style };
                    sheetData[r][2] = { v: mp2, s: mp2Style };
                    sheetData[r][3] = { v: mp3, s: mp3Style };
                    sheetData[r][4] = { v: '', s: undefined };
                    sheetData[r][5] = { v: index + 1, s: SCHEDULE_TEMPLATE.matrixCell };
                    sheetData[r][6] = { v: fullNameDisplay, s: SCHEDULE_TEMPLATE.employeeName };
                    sheetData[r][7] = { v: positionDisplay, s: SCHEDULE_TEMPLATE.description };
                } else {
                    sheetData[r][0] = { v: index + 1, s: SCHEDULE_TEMPLATE.matrixCell };
                    sheetData[r][1] = { v: fullNameDisplay, s: SCHEDULE_TEMPLATE.employeeName };
                    sheetData[r][2] = { v: positionDisplay, s: SCHEDULE_TEMPLATE.description };
                }
                
                // Days
                for(let d=1; d<=daysInMonth; d++) {
                    const c = firstDayCol - 1 + d;
                    
                    const date = new Date(year, month-1, d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    const savedStyle = existing?.[`day_${d}_s`];
                    const templateStyle = isWeekend ? getWeekendCellStyle(matrixValidationColors.weekend) : SCHEDULE_TEMPLATE.normalCell;
                    const finalStyle = savedStyle
                        ? (isWeekend
                            ? { ...savedStyle, bg: { rgb: matrixValidationColors.weekend } }
                            : savedStyle)
                        : templateStyle;

                    sheetData[r][c] = { 
                        v: existing?.[`day_${d}`] || '',
                        s: finalStyle
                    };
                }
            });

            // --- FOOTER ---
            const footerRowStart = employees.length + GRID_ROW_OFFSET + 2;
            sheetData[footerRowStart] = {
                0: { v: "Изготвил: ............................", s: SCHEDULE_TEMPLATE.footerLabel },
                [totalCols - 5]: { v: "Съгласувал: ............................", s: SCHEDULE_TEMPLATE.footerLabel }
            };
            mergeData.push({ startRow: footerRowStart, endRow: footerRowStart, startColumn: totalCols - 5, endColumn: totalCols - 1 });
            mergeData.push({ startRow: footerRowStart, endRow: footerRowStart, startColumn: 0, endColumn: 2 });

            const wbConfig = {
                id: 'schedule-wb',
                appVersion: '3.0.0',
                sheets: {
                    'sheet-1': {
                        id: 'sheet-1',
                        name: 'Schedule',
                        cellData: sheetData,
                        mergeData: mergeData,
                        columnCount: headers.length,
                        rowCount: employees.length + GRID_ROW_OFFSET + 3, 
                        freeze: { xSplit: firstDayCol, ySplit: GRID_ROW_OFFSET },
                        columnData: isMatrixMode
                            ? {
                                0: { w: 50 },
                                1: { w: 40 }, 2: { w: 40 }, 3: { w: 40 },
                                4: { w: 20 },
                                5: { w: 40 },
                                6: { w: nameColumnWidth },
                                7: { w: positionColumnWidth },
                            }
                            : {
                                0: { w: 40 },
                                1: { w: nameColumnWidth },
                                2: { w: positionColumnWidth },
                            }
                    }
                },
                locale: LocaleType.EN_US,
                styles: {}
            };
            
            // Re-check mount/ref before final create
            if (isMounted && univerRef.current) {
                 workbookRef.current = univerRef.current.createUnit(UniverInstanceType.UNIVER_SHEET, wbConfig);
                 setIsLoading(false);
            }
        })();

        return () => {
            isMounted = false;
            cleanupUniver();
        };
    }, [record?.id, renderTrigger]); // Depend on schedule id and manual triggers

    useEffect(() => {
        if (!univerRef.current || !workbookRef.current || !record?.year || !record?.month) return;

        if (colorApplyTimeoutRef.current) {
            clearTimeout(colorApplyTimeoutRef.current);
        }

        colorApplyTimeoutRef.current = setTimeout(() => {
            const sheet = workbookRef.current?.getActiveSheet();
            if (!sheet || !workbookRef.current) return;

            const employeeRowsCount = loadedEmployeesRef.current.length;
            if (employeeRowsCount <= 0) return;
            const lastEmployeeRow = GRID_ROW_OFFSET + employeeRowsCount - 1;
            const isMatrixMode = showMatrixConfigRef.current;
            const firstDayCol = isMatrixMode ? 8 : 3;
            const daysInMonth = sheet.getColumnCount() - firstDayCol;

            const commandService = (univerRef.current as any).__getInjector().get(ICommandService);

            (async () => {
                isApplyingPeriodStylesRef.current = true;
                try {
                    if (isMatrixMode) {
                        await applyMatrixFrequencyStyles(
                            commandService,
                            workbookRef.current.getUnitId(),
                            sheet.getSheetId(),
                            sheet,
                            lastEmployeeRow
                        );
                    }

                    await applyWeekendStyles(
                        commandService,
                        workbookRef.current.getUnitId(),
                        sheet.getSheetId(),
                        sheet,
                        lastEmployeeRow,
                        firstDayCol,
                        daysInMonth,
                        record.year,
                        record.month
                    );
                } finally {
                    isApplyingPeriodStylesRef.current = false;
                }
            })();
        }, 180);

        return () => {
            if (colorApplyTimeoutRef.current) {
                clearTimeout(colorApplyTimeoutRef.current);
                colorApplyTimeoutRef.current = null;
            }
        };
    }, [matrixValidationColors, showMatrixConfig, record]);

    /* REMOVED SEPARATE CLEANUP EFFECT */

    const captureGridState = () => {
        if (!workbookRef.current) return tempRowsRef.current || record.schedule_rows || [];
        const sheet = workbookRef.current.getActiveSheet();
        const isMatrixMode = showMatrixConfigRef.current;
        const firstDayCol = isMatrixMode ? 8 : 3;
        const daysInMonth = sheet.getColumnCount() - firstDayCol;
        const newRows: any[] = [];
        const employees = loadedEmployeesRef.current;
        
        // loadedEmployees contains current visible rows in order
        for (let i = 0; i < employees.length; i++) {
            const r = i + GRID_ROW_OFFSET; 
            const emp = employees[i];
            
            // Read matrix configs from cols 0,1,2,3 only in matrix mode
            const matrixGlobal = isMatrixMode ? (sheet.getCell(r, 0)?.v || '') : '';
            const matrixP1 = isMatrixMode ? (sheet.getCell(r, 1)?.v || '') : '';
            const matrixP2 = isMatrixMode ? (sheet.getCell(r, 2)?.v || '') : '';
            const matrixP3 = isMatrixMode ? (sheet.getCell(r, 3)?.v || '') : '';
            
            const rowData: any = {
                employee_id: emp.id,
                employee_name: emp.fullName || [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' '),
                matrix_global: matrixGlobal,
                matrix_p1: matrixP1,
                matrix_p2: matrixP2,
                matrix_p3: matrixP3,
            };

            for(let d=1; d<=daysInMonth; d++) {
                const c = firstDayCol - 1 + d;
                const cell = sheet.getCell(r, c);
                const val = cell?.v || '';
                
                rowData[`day_${d}`] = val;

                if (cell && cell.s) {
                    let style = cell.s;
                     if (typeof style === 'string' && workbookRef.current) {
                        try {
                             const styles = workbookRef.current.getStyles();
                             if (styles) style = styles.get(style);
                        } catch(e) {}
                    }
                    if (style) {
                         rowData[`day_${d}_s`] = style;
                    }
                }
            }
            newRows.push(rowData);
        }
        return newRows;
    };

    const persistSchedule = async (silent: boolean = false) => {
        if (!record?.id || !workbookRef.current) return;

        const employees = loadedEmployeesRef.current;
        if (employees.length === 0) {
            if (!silent) {
                notify('No employee data loaded to map rows.', { type: 'warning' });
            }
            return;
        }

        const payload = {
            position: typeof record.position === 'object' ? record.position['@id'] : record.position,
            year: record.year,
            month: record.month,
            schedule_rows: captureGridState(),
            status: record.status || 'чернова',
            working_days: calendarStats ? calendarStats.workDays : record.working_days,
            working_hours: calendarStats ? calendarStats.workHours : record.working_hours,
        };

        await new Promise<void>((resolve, reject) => {
            update('monthly_schedules', {
                id: record.id,
                data: payload,
                previousData: record
            }, {
                onSuccess: () => resolve(),
                onError: (error: any) => reject(error)
            });
        });

        if (!silent) {
            notify('Графикът е запазен успешно', { type: 'success' });
        }
    };

    const runAutoSave = async () => {
        if (isSavingRef.current) {
            hasPendingAutoSaveRef.current = true;
            setAutoSaveStatus('pending');
            return;
        }

        isSavingRef.current = true;
        setAutoSaveStatus('saving');
        try {
            await persistSchedule(true);
            setAutoSaveStatus('saved');
        } catch (error: any) {
            notify(`Авто-запазването неуспешно: ${error?.message || 'неизвестна грешка'}`, { type: 'error' });
            setAutoSaveStatus('error');
        } finally {
            isSavingRef.current = false;

            if (hasPendingAutoSaveRef.current) {
                hasPendingAutoSaveRef.current = false;
                if (autoSaveTimeoutRef.current) {
                    clearTimeout(autoSaveTimeoutRef.current);
                }
                autoSaveTimeoutRef.current = setTimeout(() => {
                    void runAutoSave();
                }, AUTO_SAVE_DEBOUNCE_MS);
            }
        }
    };

    const scheduleAutoSave = () => {
        if (!record?.id || !workbookRef.current) return;
        if (loadedEmployeesRef.current.length === 0) return;
        setAutoSaveStatus('pending');

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            void runAutoSave();
        }, AUTO_SAVE_DEBOUNCE_MS);
    };

    const handleOpenManage = async () => {
        setIsManageOpen(true);
        try {
            const positionId = typeof record.position === 'object' ? record.position.id : record.position;
            const { data } = await dataProvider.getList('employees', {
                 filter: { position: positionId, status: 'активен' },
                 pagination: { page: 1, perPage: 1000 },
                 sort: { field: 'first_name', order: 'ASC' }
            });
            const currentIds = new Set(loadedEmployees.map(e => e.id));
            setAllEmployees(data.filter((e: any) => !currentIds.has(e.id)));
        } catch(e) { console.error(e); }
    };

    const handleAddEmployee = async () => {
        if (!selectedEmp) return;
        
        const currentRows = captureGridState();
        
        const newEmpName = [selectedEmp.first_name, selectedEmp.middle_name, selectedEmp.last_name].filter(Boolean).join(' ');
        
        // Add new row with empty data
        const newRow = {
             employee_id: selectedEmp.id,
             employee_name: newEmpName
        };
        
        const newRows = [...currentRows, newRow];
        tempRowsRef.current = newRows;
        
        if (univerRef.current) {
            univerRef.current.dispose();
            univerRef.current = null;
        }

        setSelectedEmp(null);
        setAllEmployees(prev => prev.filter(e => e.id !== selectedEmp.id));
        setRenderTrigger(prev => prev + 1);
    };

    const handleRemoveEmployee = (empId: number) => {
         const currentRows = captureGridState();
         const newRows = currentRows.filter(r => r.employee_id !== empId);
         
         tempRowsRef.current = newRows;
         
         // Remove from available list if needed? Or just let it be re-fetched next time dialog opens
         // If we remove him, he should be available to add back.
         // We can add him to allEmployees if dialog is open, but usually this is called from dialog.
         // If dialog is open, we can update state.
         
         if (univerRef.current) {
            univerRef.current.dispose();
            univerRef.current = null;
        }
        
        setRenderTrigger(prev => prev + 1);
    };

    const handleCalculate = async () => {
        if (!univerRef.current || !workbookRef.current) return;
        if (!showMatrixConfigRef.current) {
            notify('Попълването от матрица е достъпно само за длъжност машинист ПЖМ.', { type: 'warning' });
            return;
        }
        
        const wb = workbookRef.current;
        const sheet = wb.getActiveSheet();
        
        const employeeRowsCount = loadedEmployees.length;
        if (employeeRowsCount <= 0) return;
        const lastEmployeeRow = GRID_ROW_OFFSET + employeeRowsCount - 1;
        
        // This is a Placeholder for the "Pattern Logic"
        // Since we don't have the explicit mapping of Pattern Columns yet,
        // We will simulate a simple "Cycle" logic (Day, Night, Rest, Rest)
        // In production, we must use `patterns` and `OrderPatternDetails`.
        
        const commandService = (univerRef.current as any).__getInjector().get(ICommandService);

        // Find the source matrix rows based on selection
        const selectedMatrix = matrixData.find(m => String(m.id) === selectedMatrixId);
        const matrixRows = selectedMatrix ? (selectedMatrix.rows || []) : null;

        if (!matrixRows && matrixData.length === 0) {
            notify("Няма намерена матрица за този месец.", { type: 'warning' });
        } else if (!matrixRows && selectedMatrixId) {
             notify("Избраната матрица няма данни.", { type: 'warning' });
        }

        const invalidMatrixRefs = new Set<string>();

        const updates: any[] = [];

        for(let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
             // Read Matrix Cols: 0,1,2,3 (Indices)
             const globalVal = sheet.getCell(r, 0)?.v;
             const p1Val = sheet.getCell(r, 1)?.v;
             const p2Val = sheet.getCell(r, 2)?.v;
             const p3Val = sheet.getCell(r, 3)?.v;
             
             if (globalVal || p1Val || p2Val || p3Val) {
                 const firstDayCol = 8;
                 const days = sheet.getColumnCount() - firstDayCol;
                 for(let d=1; d<=days; d++) {
                     let startPosToUse = globalVal;
                     // Logic for dates...
                     if (d <= periods.p1End && p1Val) startPosToUse = p1Val;
                     else if (d > periods.p1End && d <= periods.p2End && p2Val) startPosToUse = p2Val;
                     else if (d > periods.p2End && p3Val) startPosToUse = p3Val;
                     
                     const hasMatrixInput = String(startPosToUse ?? '').trim() !== '';
                     if (hasMatrixInput) {
                         let val = '';

                         if (matrixRows) {
                              // Use explicit matrix row number (1-based), independent of matrix start_position
                              const { targetRow, invalidReason } = resolveMatrixRowByNumber(matrixRows, startPosToUse);
                              if (invalidReason) {
                                  invalidMatrixRefs.add(`служител ${r - GRID_ROW_OFFSET + 1}: ${invalidReason}`);
                                  continue;
                              }

                              if (targetRow && targetRow.cells && targetRow.cells[d-1]) {
                                  // Matrix cells are 0-indexed, d is 1-indexed date
                                  val = targetRow.cells[d-1].value || '';
                              }
                         } else {
                            // Fallback (Legacy)
                            const startPosFunc = Number(startPosToUse);
                            if (isNaN(startPosFunc)) {
                                invalidMatrixRefs.add(`служител ${r - GRID_ROW_OFFSET + 1}: невалиден номер "${String(startPosToUse).trim()}"`);
                                continue;
                            }
                            const cycle = ['Д', 'Н', 'П', 'П']; 
                            val = cycle[(startPosFunc + d - 2) % 4]; 
                         }

                         // Always write, even if empty, to overwrite old data
                         const c = firstDayCol + d - 1;
                         await setCellValueSafely(commandService, wb.getUnitId(), sheet.getSheetId(), sheet, r, c, val);
                     }
                 }
             }
        }

        if (invalidMatrixRefs.size > 0) {
            const preview = Array.from(invalidMatrixRefs).slice(0, 3).join('; ');
            notify(`Графикът е попълнен частично. Невалидни стойности: ${preview}`, { type: 'warning' });
            return;
        }

        const globalConflictSummary = getGlobalColumnConflictSummary(sheet, lastEmployeeRow);
        if (hasAnyGlobalColumnConflict(globalConflictSummary)) {
            notify(`Конфликт между колони (Global и P1/P2/P3): ${buildGlobalConflictMessage(globalConflictSummary)}`, { type: 'warning' });
        }

        notify("Графикът е попълнен от настройките на матрицата.", { type: 'success' });
    };

    const handleSave = async () => {
        if (isSavingRef.current) {
            notify('Има текущо запазване. Изчакай секунда.', { type: 'info' });
            return;
        }

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
            autoSaveTimeoutRef.current = null;
        }

        isSavingRef.current = true;
        setAutoSaveStatus('saving');
        try {
            await persistSchedule(false);
            setAutoSaveStatus('saved');
        } catch (error: any) {
            notify(`Грешка при запазване: ${error?.message || 'неизвестна грешка'}`, { type: 'error' });
            setAutoSaveStatus('error');
        } finally {
            isSavingRef.current = false;
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    };

    return (
        <Box 
            position={isFullscreen ? "fixed" : "relative"}
            top={isFullscreen ? 40 : undefined}
            left={isFullscreen ? 0 : undefined}
            width={isFullscreen ? "100vw" : "100%"}
            height={isFullscreen ? "100vh" : "auto"}
            zIndex={isFullscreen ? 9999 : 1}
            bgcolor="background.paper"
        >
            {isLoading && (
                <Box 
                    position="absolute" 
                    top={0} 
                    left={0} 
                    right={0} 
                    bottom={0} 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    bgcolor="rgba(255,255,255,0.8)" 
                    zIndex={2000}
                    flexDirection="column"
                    gap={2}
                >
                    <CircularProgress />
                    <Typography variant="h6" color="textSecondary">Зареждане...</Typography>
                </Box>
            )}
            <Box 
                mt={isFullscreen ? 0 : 2} 
                height={isFullscreen ? "100%" : "calc(100vh - 100px)"} 
                width="100%" 
                display="flex" 
                flexDirection="column"
            >
            <Box p={1} bgcolor="#f5f5f5" display="flex" gap={2} alignItems="center" flexWrap="wrap">
                {calendarStats && (
                    <Box display="flex" alignItems="center" bgcolor="#e3f2fd" px={2} py={1} borderRadius={1} border="1px solid #90caf9" mr={2}>
                        <Typography variant="body2" color="primary" fontWeight="bold" sx={{ mr: 1 }}>
                            {new Date(record.year, record.month - 1).toLocaleString('bg-BG', { month: 'long' }).toUpperCase()}:
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {calendarStats.workDays} дни / {calendarStats.workHours} часа
                        </Typography>
                    </Box>
                )}

                <Box
                    display="flex"
                    alignItems="center"
                    px={1.5}
                    py={0.75}
                    borderRadius={1}
                    bgcolor={showMatrixConfig ? "#e8f5e9" : "#f3f4f6"}
                    border={showMatrixConfig ? "1px solid #a5d6a7" : "1px solid #d1d5db"}
                >
                    <Typography variant="caption" fontWeight="bold" color={showMatrixConfig ? "#2e7d32" : "textSecondary"}>
                        {showMatrixConfig ? 'Режим: С матрица' : 'Режим: Без матрица'}
                    </Typography>
                </Box>

                {showMatrixConfig && (
                    <>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">Матрица:</Typography>
                            <FormControl size="small" sx={{ minWidth: 250 }}>
                                <Select
                                    value={selectedMatrixId}
                                    onChange={(e) => setSelectedMatrixId(e.target.value)}
                                    displayEmpty
                                >
                                     <MenuItem value="" disabled><em>Избери Матрица</em></MenuItem>
                                    {matrixData.map((m: any) => {
                                         const monthName = new Date(m.year, m.month - 1).toLocaleString('bg-BG', { month: 'long' });
                                         const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                         const patternName = (typeof m === 'object' && m.patternName) ? m.patternName : (m.pattern || 'Unknown');
                                         
                                         const label = `${capitalizedMonth} - ${patternName}`; 
                                         return <MenuItem key={m.id} value={String(m.id)}>{label}</MenuItem>;
                                    })}
                                </Select>
                            </FormControl>
                        </Box>

                        <TextField 
                            label="П1 Край"
                            type="number"
                            size="small"
                            value={periods.p1End}
                            onChange={e => setPeriods(p => ({ ...p, p1End: Number(e.target.value) }))}
                            sx={{ width: 100 }}
                        />
                        <TextField 
                            label="П2 Край"
                            type="number"
                            size="small"
                            value={periods.p2End}
                            onChange={e => setPeriods(p => ({ ...p, p2End: Number(e.target.value) }))}
                            sx={{ width: 100 }}
                        />

                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" fontWeight="bold">Уникален</Typography>
                            <TextField
                                type="color"
                                size="small"
                                value={matrixValidationColors.single}
                                onChange={e => setMatrixValidationColors(prev => ({ ...prev, single: e.target.value }))}
                                sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                            />
                        </Box>

                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" fontWeight="bold">Дублиран</Typography>
                            <TextField
                                type="color"
                                size="small"
                                value={matrixValidationColors.duplicate}
                                onChange={e => setMatrixValidationColors(prev => ({ ...prev, duplicate: e.target.value }))}
                                sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                            />
                        </Box>

                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" fontWeight="bold">Празнични</Typography>
                            <TextField
                                type="color"
                                size="small"
                                value={matrixValidationColors.weekend}
                                onChange={e => setMatrixValidationColors(prev => ({ ...prev, weekend: e.target.value }))}
                                sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                            />
                        </Box>

                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setMatrixValidationColors(MATRIX_COLOR_DEFAULTS)}
                            sx={{ minWidth: 'auto', px: 1 }}
                        >
                            Възстанови
                        </Button>
                    </>
                )}
                {/* Auto -Fill Button 
                <Button variant="contained" onClick={handleCalculate} color="secondary" size="small">
                    Авто-Попълване
                </Button>
                */}
                <Button variant="outlined" onClick={handleOpenManage} disabled={isLoading} startIcon={<PersonAdd />} sx={{ mr: 1 }}>
                    Служители
                </Button>

                <Box
                    display="flex"
                    alignItems="center"
                    px={1.5}
                    py={0.75}
                    borderRadius={1}
                    bgcolor={
                        autoSaveStatus === 'saving' || autoSaveStatus === 'pending'
                            ? '#fff3e0'
                            : autoSaveStatus === 'saved'
                                ? '#e8f5e9'
                                : autoSaveStatus === 'error'
                                    ? '#ffebee'
                                    : '#f3f4f6'
                    }
                    border={
                        autoSaveStatus === 'saving' || autoSaveStatus === 'pending'
                            ? '1px solid #ffcc80'
                            : autoSaveStatus === 'saved'
                                ? '1px solid #a5d6a7'
                                : autoSaveStatus === 'error'
                                    ? '1px solid #ef9a9a'
                                    : '1px solid #d1d5db'
                    }
                >
                    <Typography variant="caption" fontWeight="bold" color={autoSaveStatus === 'error' ? 'error.main' : 'textSecondary'}>
                        {autoSaveStatus === 'pending' && 'Авто-запазване: изчаква...'}
                        {autoSaveStatus === 'saving' && 'Авто-запазване: записва...'}
                        {autoSaveStatus === 'saved' && 'Авто-запазване: запазено'}
                        {autoSaveStatus === 'error' && 'Авто-запазване: грешка'}
                        {autoSaveStatus === 'idle' && 'Авто-запазване: изкл.'}
                    </Typography>
                </Box>

                <Box flex={1} />
                
                <IconButton onClick={toggleFullscreen} color="primary" title={isFullscreen ? "Изход от цял екран" : "Цял екран"}>
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>

                <Button variant="contained" color="primary" onClick={handleSave}>
                    Запази Промените
                </Button>
            </Box>
            <Box></Box>
            <Box ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', border: '1px solid #ddd' }} />
            
            <Dialog open={isManageOpen} onClose={() => setIsManageOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Управление на служители</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2, mt: 1, display: 'flex', gap: 1 }}>
                        <Autocomplete
                            sx={{ flex: 1 }}
                            options={allEmployees}
                            getOptionLabel={(option) => `${option.first_name} ${option.middle_name || ''} ${option.last_name}`}
                            value={selectedEmp}
                            onChange={(e, v) => setSelectedEmp(v)}
                            renderInput={(params) => <TextField {...params} label="Избери служител за добавяне" />}
                        />
                        <Button onClick={handleAddEmployee} disabled={!selectedEmp} variant="contained">
                            Добави
                        </Button>
                    </Box>
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Включени в графика ({loadedEmployees.length})</Typography>
                    <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                        <List dense>
                            {loadedEmployees.map((emp) => (
                                <ListItem key={emp.id} divider>
                                    <ListItemText 
                                        primary={emp.fullName || [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ')} 
                                        secondary={`ID: ${emp.id}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveEmployee(emp.id)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsManageOpen(false)}>Затвори</Button>
                </DialogActions>
            </Dialog>

            </Box>
        </Box>
    );
};
