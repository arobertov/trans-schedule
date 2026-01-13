import React, { useEffect, useRef, useState } from 'react';
import { useDataProvider, useNotify, useRecordContext, useUpdate } from 'react-admin';
import { Box, Button, TextField, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import { Univer, LocaleType, UniverInstanceType } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';

import { enUS as UniverDesignEnUS } from "@univerjs/design";
import { enUS as UniverDocsUIEnUS } from "@univerjs/docs-ui";
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
                sheetData[r][0] = { v: `${emp.first_name} ${emp.last_name }` };
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
            }
        })();

        return () => {
            isMounted = false;
            cleanupUniver();
        };
    }, [record]); // Only depend on record

    /* REMOVED SEPARATE CLEANUP EFFECT */

    const handleCalculate = async () => {
        if (!univerRef.current) return;
        
        const wb = univerRef.current.getActiveUnit(UniverInstanceType.UNIVER_SHEET);
        const sheet = wb.getActiveSheet();
        
        const rowCount = sheet.getRowCount();
        // Skip header (row 0)
        
        // This is a Placeholder for the "Pattern Logic"
        // Since we don't have the explicit mapping of Pattern Columns yet,
        // We will simulate a simple "Cycle" logic (Day, Night, Rest, Rest)
        // In production, we must use `patterns` and `OrderPatternDetails`.
        
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
                             const cycle = ['Д', 'Н', 'П', 'П']; 
                             const val = cycle[(startPosFunc + d - 2) % 4]; 
                             sheet.getRange(r, 5+d).setValue(val);
                         }
                     }
                 }
             }
        }
        notify("Schedule filled from Matrix settings.", { type: 'success' });
    };

    return (
        <Box mt={2} height="calc(100vh - 100px)" width="100%" display="flex" flexDirection="column">
            <Box p={1} bgcolor="#f5f5f5" display="flex" gap={2} alignItems="center">
                <Typography variant="body2" fontWeight="bold">Matrix Configuration:</Typography>
                <TextField 
                    label="P1 End (Day)"
                    type="number"
                    size="small"
                    value={periods.p1End}
                    onChange={e => setPeriods(p => ({ ...p, p1End: Number(e.target.value) }))}
                    sx={{ width: 100 }}
                />
                <TextField 
                    label="P2 End (Day)"
                    type="number"
                    size="small"
                    value={periods.p2End}
                    onChange={e => setPeriods(p => ({ ...p, p2End: Number(e.target.value) }))}
                    sx={{ width: 100 }}
                />
                <Button variant="contained" onClick={handleCalculate} color="secondary">
                    Auto-Fill from Matrix
                </Button>
            </Box>
            
            <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', border: '1px solid #ddd' }} />
        </Box>
    );
};
