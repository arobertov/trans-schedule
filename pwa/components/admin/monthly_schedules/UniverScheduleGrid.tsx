import React, { useEffect, useRef, useState } from 'react';
import { useDataProvider, useNotify, useRecordContext, useUpdate } from 'react-admin';
import { Box, Button, TextField, Typography, Select, MenuItem, InputLabel, FormControl, CircularProgress, IconButton } from '@mui/material';
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
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
        fill: { rgb: '#fff5f5' },
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
    const [calendarStats, setCalendarStats] = useState<{ workDays: number, workHours: number } | null>(null);

    // Refs for accessing state inside Univer listeners
    const periodsRef = useRef(periods);
    const matrixDataRef = useRef(matrixData);
    const selectedMatrixIdRef = useRef(selectedMatrixId);

    useEffect(() => { periodsRef.current = periods; }, [periods]);
    useEffect(() => { matrixDataRef.current = matrixData; }, [matrixData]);
    useEffect(() => { selectedMatrixIdRef.current = selectedMatrixId; }, [selectedMatrixId]);

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
    }, [dataProvider, record]);

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
    }, [dataProvider, record]);
    
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
            if (command.id === SetRangeValuesCommand.id) {
                const params = command.params;
                const range = params.range;
                
                if (!range) return;

                // 1. Avoid infinite loop: if update is strictly on Col 0, ignore
                if (range.startColumn === 0 && range.endColumn === 0) return;

                const wb = univerInstanceService.getUnit(params.unitId);
                const sheet = wb?.getSheetBySheetId(params.subUnitId);
                if (!sheet) return;
                
                // 2. React if update touches Col 1 (Global) - Update Counts
                if (range.startColumn <= 1 && range.endColumn >= 1) {
                    const rowCount = sheet.getRowCount(); // includes headers
                    
                    // First pass: Count frequencies for Global Column (Index 1)
                    const counts = new Map<string, number>();
                    
                    for(let r = GRID_ROW_OFFSET; r < rowCount; r++) {
                        const cell = sheet.getCell(r, 1);
                        const val = cell?.v ? String(cell.v) : '';
                        if (val) {
                             counts.set(val, (counts.get(val) || 0) + 1);
                        }
                    }

                    // Second pass: Update Column 0 where needed
                    for(let r = GRID_ROW_OFFSET; r < rowCount; r++) {
                        const cellGlobal = sheet.getCell(r, 1);
                        const globalVal = cellGlobal?.v ? String(cellGlobal.v) : '';
                        
                        let newCount = 0;
                        let newStyle = SCHEDULE_TEMPLATE.countCellPink;

                        if (globalVal) {
                            const freq = counts.get(globalVal) || 0;
                            if (freq === 1) {
                                newStyle = SCHEDULE_TEMPLATE.countCellGreen;
                                newCount = 1;
                            } else if (freq > 1) {
                                newStyle = SCHEDULE_TEMPLATE.countCellRed;
                                newCount = freq;
                            }
                        }

                        await commandService.executeCommand(SetRangeValuesCommand.id, {
                            unitId: params.unitId,
                            subUnitId: params.subUnitId,
                            range: { startRow: r, startColumn: 0, endRow: r, endColumn: 0 },
                            value: { v: newCount, s: newStyle }
                        });
                    }
                }

                // 3. Auto-fill schedule if update touches Matrix Inputs (Cols 1-4)
                if (range.endColumn >= 1 && range.startColumn <= 4) {
                    const currentMatrixData = matrixDataRef.current;
                    const currentMatrixId = selectedMatrixIdRef.current;
                    const currentPeriods = periodsRef.current;

                    const selectedMatrix = currentMatrixData.find(m => String(m.id) === currentMatrixId);
                    const matrixRows = selectedMatrix ? (selectedMatrix.rows || []) : null;
                    const days = sheet.getColumnCount() - 9; // Offset 9

                    // Helper to get letter from multiple sources or calculate
                    const getValForDay = (day: number, startPos: any) => {
                         const startPosFunc = Number(startPos);
                         if (isNaN(startPosFunc)) return '';
                         
                         if (matrixRows) {
                              const targetRow = matrixRows.find((mr: any) => mr.start_position === startPosFunc);
                              if (targetRow && targetRow.cells && targetRow.cells[day-1]) {
                                  return targetRow.cells[day-1].value || '';
                              }
                         } else {
                            const cycle = ['Д', 'Н', 'П', 'П']; 
                            return cycle[(startPosFunc + day - 2) % 4]; 
                         }
                         return '';
                    };

                    for(let r = range.startRow; r <= range.endRow; r++) {
                        if (r < GRID_ROW_OFFSET) continue;

                        const globalVal = sheet.getCell(r, 1)?.v;
                        const p1Val = sheet.getCell(r, 2)?.v;
                        const p2Val = sheet.getCell(r, 3)?.v;
                        const p3Val = sheet.getCell(r, 4)?.v;

                        if (globalVal || p1Val || p2Val || p3Val) {
                            for(let d=1; d<=days; d++) {
                                let startPosToUse = globalVal;
                                if (d <= currentPeriods.p1End && p1Val) startPosToUse = p1Val;
                                else if (d > currentPeriods.p1End && d <= currentPeriods.p2End && p2Val) startPosToUse = p2Val;
                                else if (d > currentPeriods.p2End && p3Val) startPosToUse = p3Val;

                                if (startPosToUse) {
                                    const val = getValForDay(d, startPosToUse);
                                    // Removed check "if (val)" to ensure empty values overwrite existing cells
                                    const c = 8 + d; // Offset fixed to match Day 1 at index 9
                                    await commandService.executeCommand(SetRangeValuesCommand.id, {
                                        unitId: params.unitId,
                                        subUnitId: params.subUnitId,
                                        range: { startRow: r, startColumn: c, endRow: r, endColumn: c },
                                        value: { v: val }
                                    });
                                }
                            }
                        }
                    }
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
                        if (isMounted && posData) positionName = posData.name;
                    } catch (err) {
                        console.warn('Failed to fetch position details', err);
                    }
                }

                if (isMounted) {
                    const { data } = await dataProvider.getList('employees', {
                        filter: { position: positionId, status: 'активен' },
                        pagination: { page: 1, perPage: 1000 },
                        sort: { field: 'id', order: 'ASC' }
                    });
                    employees = data;
                    setLoadedEmployees(data);
                }
            } catch(e) { console.error(e); }

            // Ensure Univer is still available and component mounted
            if (!isMounted || !univerRef.current) return;

            const year = record.year;
            const month = record.month; 
            const daysInMonth = new Date(year, month, 0).getDate();

            // Structure:
            // 0: Count (Calc)
            // 1: Global (No)
            // 2: P1 (I)
            // 3: P2 (II)
            // 4: P3 (III)
            // 5: Spacer
            // 6: No
            // 7: Name
            // 8: Position
            // 9..: Days
            const headers = ['Брой', 'Global', 'P1', 'P2', 'P3', '', '№', 'Служител', 'Длъжност'];
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

            // Row 2: "Add row matrix" (Left) 
            sheetData[2] = {
                0: { v: 'Добави ред от матрицата', s: SCHEDULE_TEMPLATE.leftTableHeader }
            };
            mergeData.push({ startRow: 2, endRow: 2, startColumn: 0, endColumn: 4 });

            // Row 3: "Whole month" / "Periods" (Left)
            sheetData[3] = {};
            sheetData[3][0] = { v: 'За целия месец', s: SCHEDULE_TEMPLATE.leftTableHeader };
            sheetData[3][2] = { v: 'Периоди:', s: SCHEDULE_TEMPLATE.leftTableHeader };
            mergeData.push({ startRow: 3, endRow: 3, startColumn: 0, endColumn: 1 });   // "Whole month" spans 2 cols
            mergeData.push({ startRow: 3, endRow: 3, startColumn: 2, endColumn: 4 }); // Periods spans 3 cols

            // Row 4: Grid Headers
            const headerRowIdx = GRID_ROW_OFFSET - 1; // 4
            sheetData[headerRowIdx] = {
                // Left
                0: { v: 'Брой повторения', s: SCHEDULE_TEMPLATE.leftTableHeader },
                1: { v: 'Ред №', s: { ...SCHEDULE_TEMPLATE.leftTableHeader, fill: { rgb: '#ccc' } } },
                2: { v: 'I', s: SCHEDULE_TEMPLATE.leftTableHeader },
                3: { v: 'II', s: SCHEDULE_TEMPLATE.leftTableHeader },
                4: { v: 'III', s: SCHEDULE_TEMPLATE.leftTableHeader },
                
                // Right
                6: { v: '№', s: SCHEDULE_TEMPLATE.header },
                7: { v: 'Име, Презиме, Фамилия', s: SCHEDULE_TEMPLATE.header },
                8: { v: 'Длъжност', s: SCHEDULE_TEMPLATE.header },
            };
            
            for(let i=1; i<=daysInMonth; i++) {
                sheetData[headerRowIdx][8+i] = { v: String(i), s: SCHEDULE_TEMPLATE.header };
            }

            // Calculation for Frequencies (Global Only)
            const savedRows = record.schedule_rows || [];
            const idCounts = new Map<string, number>();
            savedRows.forEach((r: any) => {
                if(r.matrix_global) {
                    const k = String(r.matrix_global);
                    idCounts.set(k, (idCounts.get(k) || 0) + 1);
                }
            });

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

                // Calculate frequency (Global only)
                let freq = 0;
                if(mg) {
                     freq = idCounts.get(String(mg)) || 0;
                }
                
                // Determine Count Cell Style
                let countStyle = SCHEDULE_TEMPLATE.countCellPink;
                let countVal = 0;
                
                if (mg) {
                    // If we have a Global ID
                    if (freq === 1) {
                        countStyle = SCHEDULE_TEMPLATE.countCellGreen;
                        countVal = freq; 
                    } else if (freq > 1) {
                        countStyle = SCHEDULE_TEMPLATE.countCellRed;
                        countVal = freq;
                    }
                } else {
                     // Empty - Pink
                     countStyle = SCHEDULE_TEMPLATE.countCellPink;
                     countVal = 0;
                }

                sheetData[r][0] = { v: countVal, s: countStyle };
                sheetData[r][1] = { v: mg, s: SCHEDULE_TEMPLATE.matrixInputCell };
                sheetData[r][2] = { v: mp1, s: SCHEDULE_TEMPLATE.matrixInputCell };
                sheetData[r][3] = { v: mp2, s: SCHEDULE_TEMPLATE.matrixInputCell };
                sheetData[r][4] = { v: mp3, s: SCHEDULE_TEMPLATE.matrixInputCell };
                
                // Col 5 Spacer
                sheetData[r][5] = { v: '', s: undefined };

                // --- RIGHT TABLE DATA ---
                const fullName = [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ');
                
                sheetData[r][6] = { v: index + 1, s: SCHEDULE_TEMPLATE.matrixCell }; 
                sheetData[r][7] = { v: fullName, s: SCHEDULE_TEMPLATE.employeeName };
                sheetData[r][8] = { v: positionName, s: SCHEDULE_TEMPLATE.description };
                
                // Days
                for(let d=1; d<=daysInMonth; d++) {
                    const c = 8 + d; // Shifted: 0-8 occupied. Day 1 is 9.
                    
                    const date = new Date(year, month-1, d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    const savedStyle = existing?.[`day_${d}_s`];
                    const templateStyle = isWeekend ? SCHEDULE_TEMPLATE.weekendCell : SCHEDULE_TEMPLATE.normalCell;

                    sheetData[r][c] = { 
                        v: existing?.[`day_${d}`] || '',
                        s: savedStyle || templateStyle
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
                        freeze: { xSplit: 9, ySplit: GRID_ROW_OFFSET }, // Freeze at Day 1 (Col 9)
                        columnData: {
                            0: { w: 80 }, // Count
                            1: { w: 50 }, // Global
                            2: { w: 40 }, 3: { w: 40 }, 4: { w: 40 }, // Periods
                            5: { w: 20 }, // Spacer
                            6: { w: 40 }, // No
                            7: { w: 250 }, // Name
                            8: { w: 120 }, // Position
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
    }, [record]); // Only depend on record

    /* REMOVED SEPARATE CLEANUP EFFECT */

    const handleCalculate = async () => {
        if (!univerRef.current || !workbookRef.current) return;
        
        const wb = workbookRef.current;
        const sheet = wb.getActiveSheet();
        
        const rowCount = sheet.getRowCount();
        // Skip header (row 0)
        
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

        const updates: any[] = [];

        for(let r=GRID_ROW_OFFSET; r<rowCount; r++) {
             // Read Matrix Cols: 1,2,3,4 (Indices)
             const globalVal = sheet.getCell(r, 1)?.v;
             const p1Val = sheet.getCell(r, 2)?.v;
             const p2Val = sheet.getCell(r, 3)?.v;
             const p3Val = sheet.getCell(r, 4)?.v;
             
             if (globalVal || p1Val || p2Val || p3Val) {
                 const days = sheet.getColumnCount() - 9; // Offset 9
                 for(let d=1; d<=days; d++) {
                     let startPosToUse = globalVal;
                     // Logic for dates...
                     if (d <= periods.p1End && p1Val) startPosToUse = p1Val;
                     else if (d > periods.p1End && d <= periods.p2End && p2Val) startPosToUse = p2Val;
                     else if (d > periods.p2End && p3Val) startPosToUse = p3Val;
                     
                     if (startPosToUse) {
                         const startPosFunc = Number(startPosToUse);
                         if (!isNaN(startPosFunc)) {
                             let val = '';
                             
                             if (matrixRows) {
                                  // Find the row in the pre-calculated matrix corresponding to startPosFunc
                                  const targetRow = matrixRows.find((mr: any) => mr.start_position === startPosFunc);
                                  if (targetRow && targetRow.cells && targetRow.cells[d-1]) {
                                      // Matrix cells are 0-indexed, d is 1-indexed date
                                      val = targetRow.cells[d-1].value || '';
                                  }
                             } else {
                                // Fallback (Legacy)
                                const cycle = ['Д', 'Н', 'П', 'П']; 
                                val = cycle[(startPosFunc + d - 2) % 4]; 
                             }

                             // Always write, even if empty, to overwrite old data
                             const c = 8 + d;
                             await commandService.executeCommand(SetRangeValuesCommand.id, {
                                 unitId: wb.getUnitId(),
                                 subUnitId: sheet.getSheetId(),
                                 range: { startRow: r, startColumn: c, endRow: r, endColumn: c },
                                 value: { v: val }
                             });
                         }
                     }
                 }
             }
        }
        notify("Графикът е попълнен от настройките на матрицата.", { type: 'success' });
    };

    const handleSave = async () => {
        if (!workbookRef.current) return;
        const sheet = workbookRef.current.getActiveSheet();
        
        const rowCount = sheet.getRowCount(); // Note: contains header + employees + empty space
        const daysInMonth = sheet.getColumnCount() - 9;
        
        const newRows: any[] = [];
        
        // Iterate only rows corresponding to employees
        // Assumes row index 1 maps to loadedEmployees[0]
        if (loadedEmployees.length === 0) {
            notify("No employee data loaded to map rows.", { type: 'warning' });
            return;
        }

        for (let i = 0; i < loadedEmployees.length; i++) {
            const r = i + GRID_ROW_OFFSET; 
            const emp = loadedEmployees[i];
            
            // Read matrix configs from cols 1,2,3,4
            const matrixGlobal = sheet.getCell(r, 1)?.v || '';
            const matrixP1 = sheet.getCell(r, 2)?.v || '';
            const matrixP2 = sheet.getCell(r, 3)?.v || '';
            const matrixP3 = sheet.getCell(r, 4)?.v || '';
            
            const rowData: any = {
                employee_id: emp.id,
                matrix_global: matrixGlobal,
                matrix_p1: matrixP1,
                matrix_p2: matrixP2,
                matrix_p3: matrixP3,
            };

            // Read days
            for(let d=1; d<=daysInMonth; d++) {
                const c = 8 + d; // Offset fixed to match Day 1 at index 9
                const cell = sheet.getCell(r, c);
                const val = cell?.v || '';
                
                rowData[`day_${d}`] = val;

                // Save Style
                if (cell && cell.s) {
                    let style = cell.s;
                    // If it is an ID string, resolve it from Styles collection
                     if (typeof style === 'string' && workbookRef.current) {
                        const styles = workbookRef.current.getStyles();
                        style = styles.get(style);
                    }
                    if (style) {
                         rowData[`day_${d}_s`] = style;
                    }
                }
            }
            
            newRows.push(rowData);
        }
        
        // Trigger update
        // Important: We must pass ALL required fields for PUT, or use PATCH if supported.
        // API Platform PUT usually replaces the resource.
        // And useRecordContext might return partial data.
        
        const payload = {
            position: typeof record.position === 'object' ? record.position['@id'] : record.position,
            year: record.year,
            month: record.month,
            schedule_rows: newRows,
            status: record.status || 'чернова',
            working_days: calendarStats ? calendarStats.workDays : record.working_days,
            working_hours: calendarStats ? calendarStats.workHours : record.working_hours,
        };

        update('monthly_schedules', { 
            id: record.id, 
            data: payload,
            previousData: record 
        }, {
            onSuccess: () => {
                notify("Графикът е запазен успешно", { type: 'success' });
            },
            onError: (error) => {
                notify(`Грешка при запазване: ${error.message}`, { type: 'error' });
            }
        });
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
                                 // Use pattern name if available, otherwise fallback to ID
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
                {/* Auto -Fill Button 
                <Button variant="contained" onClick={handleCalculate} color="secondary" size="small">
                    Авто-Попълване
                </Button>
                */}
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
            </Box>
        </Box>
    );
};
