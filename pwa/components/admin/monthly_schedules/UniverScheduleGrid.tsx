import React, { useEffect, useRef, useState } from 'react';
import { useDataProvider, useNotify, useRecordContext, useUpdate } from 'react-admin';
import { Box, Button, TextField, Typography, Select, MenuItem, InputLabel, FormControl, CircularProgress, IconButton } from '@mui/material';
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import { Univer, LocaleType, UniverInstanceType, ICommandService } from '@univerjs/core';
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

import { enUS as UniverDesignEnUS } from "@univerjs/design";
import { enUS as UniverDocsUIEnUS } from "@univerjs/docs-ui";
import { enUS as UniverSheetsFormulaUIEnUS } from "@univerjs/sheets-formula-ui";
import { enUS as UniverSheetsUIEnUS } from "@univerjs/sheets-ui";
import { enUS as UniverUIEnUS } from "@univerjs/ui";

const headerStyle = {
    fill: { rgb: '#f0f0f0' },
    hAlign: 2, 
    vAlign: 2, 
    bd: { b: { style: 1, color: { rgb: '#ccc' } }, r: { style: 1, color: { rgb: '#ccc' } } },
    fw: 1, 
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
    const [calendarStats, setCalendarStats] = useState<{ workDays: number, workHours: number } | null>(null);

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
            const headers = ['Служител', 'Длъжност', 'Global', 'P1', 'P2', 'P3'];
            for(let i=1; i<=daysInMonth; i++) headers.push(String(i));

            const sheetData: any = {};
            
            // Header
            sheetData[0] = {};
            headers.forEach((h, i) => {
                sheetData[0][i] = { v: h, s: headerStyle };
            });

            // Rows
            const savedRows = record.schedule_rows || [];
            
            employees.forEach((emp, index) => {
                const r = index + 1;
                sheetData[r] = {};
                
                const existing = savedRows.find((sr: any) => sr.employee_id === emp.id);
                
                // Static info
                // Use all 3 names: first, middle (if any), last
                const fullName = [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ');
                sheetData[r][0] = { v: fullName };
                sheetData[r][1] = { v: positionName }; // Updated
                
                // Matrix (restore or empty)
                sheetData[r][2] = { v: existing?.matrix_global || '' };
                sheetData[r][3] = { v: existing?.matrix_p1 || '' };
                sheetData[r][4] = { v: existing?.matrix_p2 || '' };
                sheetData[r][5] = { v: existing?.matrix_p3 || '' };

                // Days
                for(let d=1; d<=daysInMonth; d++) {
                    const c = 5 + d;
                    const date = new Date(year, month-1, d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    sheetData[r][c] = { 
                        v: existing?.[`day_${d}`] || '',
                        s: isWeekend ? { bg: { rgb: '#fff0f0' } } : undefined
                    };
                }
            });

            const wbConfig = {
                id: 'schedule-wb',
                appVersion: '3.0.0',
                sheets: {
                    'sheet-1': {
                        id: 'sheet-1',
                        name: 'Schedule',
                        cellData: sheetData,
                        columnCount: headers.length,
                        rowCount: employees.length + 10,
                        freeze: { xSplit: 2, ySplit: 1 },
                        columnData: {
                            0: { w: 180 },
                            1: { w: 100 },
                            2: { w: 50 }, 3: { w: 40 }, 4: { w: 40 }, 5: { w: 40 }
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

        for(let r=1; r<rowCount; r++) {
             // Read Matrix Cols: 2,3,4,5
             const globalVal = sheet.getCell(r, 2)?.v;
             const p1Val = sheet.getCell(r, 3)?.v;
             const p2Val = sheet.getCell(r, 4)?.v;
             const p3Val = sheet.getCell(r, 5)?.v;
             
             if (globalVal || p1Val || p2Val || p3Val) {
                 const days = sheet.getColumnCount() - 6;
                 for(let d=1; d<=days; d++) {
                     let startPosToUse = globalVal;
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

                             if (val) {
                                await commandService.executeCommand(SetRangeValuesCommand.id, {
                                    unitId: wb.getUnitId(),
                                    subUnitId: sheet.getSheetId(),
                                    range: { startRow: r, startColumn: 5+d, endRow: r, endColumn: 5+d },
                                    value: { v: val }
                                });
                             }
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
        const daysInMonth = sheet.getColumnCount() - 6;
        
        const newRows: any[] = [];
        
        // Iterate only rows corresponding to employees
        // Assumes row index 1 maps to loadedEmployees[0]
        if (loadedEmployees.length === 0) {
            notify("No employee data loaded to map rows.", { type: 'warning' });
            return;
        }

        for (let i = 0; i < loadedEmployees.length; i++) {
            const r = i + 1; // 1-based index in sheet
            const emp = loadedEmployees[i];
            
            // Read matrix configs from cols 2,3,4,5
            const matrixGlobal = sheet.getCell(r, 2)?.v || '';
            const matrixP1 = sheet.getCell(r, 3)?.v || '';
            const matrixP2 = sheet.getCell(r, 4)?.v || '';
            const matrixP3 = sheet.getCell(r, 5)?.v || '';
            
            const rowData: any = {
                employee_id: emp.id,
                matrix_global: matrixGlobal,
                matrix_p1: matrixP1,
                matrix_p2: matrixP2,
                matrix_p3: matrixP3,
            };

            // Read days
            for(let d=1; d<=daysInMonth; d++) {
                const val = sheet.getCell(r, 5+d)?.v || '';
                rowData[`day_${d}`] = val;
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
            top={isFullscreen ? 0 : undefined}
            left={isFullscreen ? 0 : undefined}
            width={isFullscreen ? "100vw" : "100%"}
            height={isFullscreen ? "100vh" : "auto"}
            zIndex={isFullscreen ? 1300 : 1}
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
                                 const patternName = (typeof m.pattern === 'object' && m.pattern?.name) ? m.pattern.name : (m.pattern || 'Unknown');
                                 
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
                <Button variant="contained" onClick={handleCalculate} color="secondary" size="small">
                    Авто-Попълване
                </Button>
                
                <Box flex={1} />
                
                <IconButton onClick={toggleFullscreen} color="primary" title={isFullscreen ? "Изход от цял екран" : "Цял екран"}>
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>

                <Button variant="contained" color="primary" onClick={handleSave}>
                    Запази Промените
                </Button>
            </Box>
            
            <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', border: '1px solid #ddd' }} />
            </Box>
        </Box>
    );
};
