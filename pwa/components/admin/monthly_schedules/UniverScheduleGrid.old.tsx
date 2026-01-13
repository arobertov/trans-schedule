import React, { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useDataProvider, useNotify, useRecordContext, useUpdate } from 'react-admin';
import { Box, Button, Typography, TextField } from '@mui/material';
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";

// We need to dynamically import Univer modules to avoid SSR issues or ensure proper loading
import { Univer, LocaleType, UniverInstanceType } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverUIPlugin } from '@univerjs/ui';

export const UniverScheduleGrid: FC = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const dataProvider = useDataProvider();
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<Univer | null>(null);
    const workbookRef = useRef<any>(null); // Type as any for now due to complexity

    const [isDriver, setIsDriver] = useState(false);
    
    // Period Configuration
    const [periods, setPeriods] = useState({
        p1: { start: 1, end: 10 },
        p2: { start: 11, end: 20 },
        p3: { start: 21, end: 31 } // Will be capped by month days
    });

    // Check Is Driver
    useEffect(() => {
        if (!record) return;
        const check = async () => {
            let isDriverCheck = record.position?.name === 'Машинист ПЖМ';
            if (!isDriverCheck && typeof record.position === 'object' && record.position.id) {
               // Assuming name logic handled or cached already
            }
             // For now relying on simple name check or explicit true from prev context
             // In real app better to fetch if needed
            if (!isDriverCheck && record.position) {
                 // Fallback fetch if strictly needed
            }
            if (record.position?.name === 'Машинист ПЖМ') setIsDriver(true);
        };
        check();
    }, [record]);


    // Initialize Univer
    useEffect(() => {
        if (!containerRef.current) return;
        if (univerRef.current) return; // Already initialized

        const univer = new Univer({
            theme: defaultTheme,
            locale: LocaleType.EN_US,
        });

        univer.registerPlugin(UniverRenderEnginePlugin);
        univer.registerPlugin(UniverFormulaEnginePlugin);
        univer.registerPlugin(UniverUIPlugin, {
            container: containerRef.current,
            header: true,
            toolbar: true,
            footer: false,
        });
        
        univer.registerPlugin(UniverDocsPlugin, {
            hasScroll: false,
        });
        univer.registerPlugin(UniverDocsUIPlugin);
        univer.registerPlugin(UniverSheetsPlugin);
        univer.registerPlugin(UniverSheetsUIPlugin);

        univerRef.current = univer;

        // Create Workbook
        const workbook = univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
            id: 'schedule-workbook',
            name: 'График',
            appVersion: '3.0.0',
            sheets: {
                'sheet-1': {
                    name: 'График',
                    id: 'sheet-1',
                    rowCount: 100,
                    columnCount: 50,
                    freeze: {
                        startColumn: 2 // Freeze Name column
                    }
                }
            },
            locale: LocaleType.EN_US,
            styles: {} 
        });
        
        workbookRef.current = workbook;

        return () => {
            univer.dispose();
            univerRef.current = null;
        };
    }, []);

    // Load Data
    useEffect(() => {
        if(!workbookRef.current || !record) return;

        const loadData = async () => {
            const daysInMonth = new Date(record.year, record.month, 0).getDate();
            const daysHeaders = Array.from({length: daysInMonth}, (_, i) => i + 1);
            
            // Build Headers
            // Col A: Name (Служител)
            // Col B: Position (Длъжност)
            // Col C: Matrix Global (Матрица) - For Drivers
            // Col D: P1 Matrix
            // Col E: P2 Matrix
            // Col F: P3 Matrix
            // Col G+: Days...
            
            // Setup Headers...
            // Note: Univer Data manipulation is different, usually commands or snapshot update.
            // Simplified for prototype:
            
             console.log("Loading Univer Data...");
        };
        
        loadData();
    }, [record, isDriver]);

    return (
        <Box sx={{ mt: 2 }}>
            <Box mb={2} display="flex" gap={2}>
                 <TextField 
                    label="Period 1 End" 
                    type="number" 
                    size="small"
                    value={periods.p1.end}
                    onChange={(e) => setPeriods({...periods, p1: {...periods.p1, end: Number(e.target.value)}})}
                 />
                  <TextField 
                    label="Period 2 End" 
                    type="number" 
                    size="small"
                    value={periods.p2.end}
                    onChange={(e) => setPeriods({...periods, p2: {...periods.p2, end: Number(e.target.value)}})}
                 />
                 <Button variant="contained">Save Schedule</Button>
            </Box>
            <div ref={containerRef} className="univer-container" style={{ height: '80vh', width: '100%' }} />
        </Box>
    );
}
