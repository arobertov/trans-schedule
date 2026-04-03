import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Slider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TransformIcon from '@mui/icons-material/Transform';
import SaveIcon from '@mui/icons-material/Save';
import TuneIcon from '@mui/icons-material/Tune';

interface ScheduleLine {
    id: number;
    train_number: string;
    station_track: string;
    arrival_time?: string;
    departure_time?: string;
}

export interface ShiftBlock {
    shiftCode: string;
    trainNumber: string;
    startTime: number;
    endTime: number;
    color: string;
}

interface ShiftScheduleOption {
    id: string;
    name: string;
}

interface Props {
    lines: ScheduleLine[];
    stations: string[]; // Ordered list of key stations to display labels for
    height?: string;
    title?: string;
    scheduleId?: string | number;
    shiftBlocks?: ShiftBlock[];
    shiftSchedules?: ShiftScheduleOption[];
    selectedShiftScheduleId?: string | null;
    onShiftScheduleSelect?: (id: string | null) => void;
}

export interface ShiftVisualSettings {
    rowSpacing: number;     // pixels per Y-axis row, 30-120
    blockOffset: number;    // vertical offset below axis line in pixels, 0-30
    blockHeight: number;    // block height (% of band), 20-90
    blockOpacity: number;   // 0.1-1.0
    labelFontSize: number;  // station label font size, 6-14
    codeFontSize: number;   // shift code font in blocks, 6-14
    colorOverrides: Record<string, string>; // shift_code -> color
}

const DEFAULT_SETTINGS: ShiftVisualSettings = {
    rowSpacing: 50,
    blockOffset: 5,
    blockHeight: 45,
    blockOpacity: 0.75,
    labelFontSize: 9,
    codeFontSize: 9,
    colorOverrides: {},
};

const timeToDecimal = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    let h = 0, m = 0;
    if (match) {
        h = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
    } else {
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
            h = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
        } else {
            return null;
        }
    }
    if (isNaN(h) || isNaN(m)) return null;
    let val = h + m / 60;
    // Schedule logic: Shift early morning hours (00:00 - 03:59) to > 24 for continuity
    // Assuming schedule day starts at 04:00
    if (val < 4) {
        val += 24;
    }
    return val;
};

const decimalToTime = (val: number): string => {
    let normalized = val;
    if (normalized >= 24) normalized -= 24;
    const h = Math.floor(normalized);
    const m = Math.round((normalized - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const TimeDistanceChart = ({ lines, stations, height = '800px', title = 'График Движение', scheduleId, shiftBlocks = [], shiftSchedules = [], selectedShiftScheduleId = null, onShiftScheduleSelect }: Props) => {
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [savedMappingsString, setSavedMappingsString] = useState<string>('{}');
    const [sourceTrain, setSourceTrain] = useState('');
    const [targetTrain, setTargetTrain] = useState('');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const echartsRef = useRef<any>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [printFormat, setPrintFormat] = useState<'A4' | 'A3' | 'A2' | 'A1' | 'A0'>('A3');
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
    const [printScale, setPrintScale] = useState(2);
    const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
    const [pendingScheduleId, setPendingScheduleId] = useState<string>(selectedShiftScheduleId || '');
    const [shiftSettings, setShiftSettings] = useState<ShiftVisualSettings>(DEFAULT_SETTINGS);

    // Load shift visual settings from localStorage
    useEffect(() => {
        if (scheduleId) {
            const saved = localStorage.getItem(`shift_visual_settings_${scheduleId}`);
            if (saved) {
                try {
                    setShiftSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
                } catch (e) {
                    console.error('Error parsing shift visual settings', e);
                }
            }
        }
    }, [scheduleId]);

    const saveShiftSettings = useCallback((next: ShiftVisualSettings) => {
        setShiftSettings(next);
        if (scheduleId) {
            localStorage.setItem(`shift_visual_settings_${scheduleId}`, JSON.stringify(next));
        }
    }, [scheduleId]);

    // Watch for fullscreen changes to update layout
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    // Load mappings from localStorage
    useEffect(() => {
        if (scheduleId) {
            const saved = localStorage.getItem(`train_schedule_mappings_${scheduleId}`);
            if (saved) {
                try {
                    setMappings(JSON.parse(saved));
                    setSavedMappingsString(saved);
                } catch (e) {
                    console.error('Error parsing saved mappings', e);
                }
            } else {
                setSavedMappingsString('{}');
            }
        }
    }, [scheduleId]);

    const handleSaveConfiguration = () => {
        if (scheduleId) {
            const json = JSON.stringify(mappings);
            localStorage.setItem(`train_schedule_mappings_${scheduleId}`, json);
            setSavedMappingsString(json);
            setShowSaveSuccess(true);
        }
    };
    
    const hasChanges = useMemo(() => {
        return JSON.stringify(mappings) !== savedMappingsString;
    }, [mappings, savedMappingsString]);

    // Count visible train rows for dynamic chart height
    const visibleTrainCount = useMemo(() => {
        const all = new Set(lines.map(l => l.train_number));
        return Array.from(all).filter(t => !mappings[t]).length;
    }, [lines, mappings]);

    const dynamicChartHeight = Math.max(400, visibleTrainCount * shiftSettings.rowSpacing + 160);

    // Extract all unique train numbers for the dropdowns
    const allTrainNumbers = useMemo(() => {
        const s = new Set<string>();
        lines.forEach(l => s.add(l.train_number));
        return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [lines]);

    const handleAddMapping = () => {
        if (sourceTrain && targetTrain && sourceTrain !== targetTrain) {
            setMappings(prev => ({ ...prev, [sourceTrain]: targetTrain }));
            setSourceTrain('');
            setTargetTrain('');
        }
    };

    const handleRemoveMapping = (source: string) => {
        setMappings(prev => {
            const next = { ...prev };
            delete next[source];
            return next;
        });
    };

    const handleOpenShiftDialog = useCallback(() => {
        setPendingScheduleId(selectedShiftScheduleId || '');
        setShiftDialogOpen(true);
    }, [selectedShiftScheduleId]);

    const handleShiftDialogConfirm = () => {
        onShiftScheduleSelect?.(pendingScheduleId || null);
        setShiftDialogOpen(false);
    };

    const handleShiftDialogClear = () => {
        onShiftScheduleSelect?.(null);
        setPendingScheduleId('');
        setShiftDialogOpen(false);
    };

    const PAPER_SIZES: Record<string, [number, number]> = {
        A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189],
    };

    const handlePrint = useCallback(() => {
        const echarts = echartsRef.current?.getEchartsInstance();
        if (!echarts) return;

        // Temporarily hide toolbox and dataZoom sliders for a clean capture
        echarts.setOption({ toolbox: { show: false } });
        echarts.setOption(
            { dataZoom: [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' },
            ]},
            { replaceMerge: ['dataZoom'] }
        );

        const dataUrl = echarts.getDataURL({ type: 'png', pixelRatio: printScale, backgroundColor: '#fff' });

        // Restore toolbox and all four dataZoom controls
        echarts.setOption({ toolbox: { show: true } });
        echarts.setOption(
            { dataZoom: [
                { type: 'slider', xAxisIndex: 0, filterMode: 'none' },
                { type: 'slider', yAxisIndex: 0, filterMode: 'empty', right: 10 },
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' },
            ]},
            { replaceMerge: ['dataZoom'] }
        );
        const [pw, ph] = PAPER_SIZES[printFormat];
        const isLandscape = printOrientation === 'landscape';
        const widthMm = isLandscape ? ph : pw;
        const heightMm = isLandscape ? pw : ph;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(
            `<!DOCTYPE html><html><head><title>${title}</title><style>` +
            `@page{size:${widthMm}mm ${heightMm}mm;margin:8mm}` +
            `body{margin:0;padding:0}img{width:100%;height:auto;display:block}` +
            `</style></head><body><img src="${dataUrl}"/></body></html>`
        );
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 600);
        setPrintDialogOpen(false);
    }, [printFormat, printOrientation, printScale, title]);

    const handleSaveAsImage = useCallback(() => {
        const echarts = echartsRef.current?.getEchartsInstance();
        if (!echarts) return;
        echarts.setOption({ toolbox: { show: false } });
        echarts.setOption(
            { dataZoom: [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' },
            ]},
            { replaceMerge: ['dataZoom'] }
        );
        const dataUrl = echarts.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        echarts.setOption({ toolbox: { show: true } });
        echarts.setOption(
            { dataZoom: [
                { type: 'slider', xAxisIndex: 0, filterMode: 'none' },
                { type: 'slider', yAxisIndex: 0, filterMode: 'empty', right: 10 },
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' },
            ]},
            { replaceMerge: ['dataZoom'] }
        );
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${title}.png`;
        link.click();
    }, [title]);

    const option = useMemo(() => {
        // 1. Group ALL lines by Train Number first
        // We need all lines initially to find start/end of train
        const trainRawMap = new Map<string, {line: ScheduleLine, timeVal: number}[]>();

        lines.forEach(l => {
             // Calculate time for every line to allow sorting
            const tStr = l.departure_time || l.arrival_time;
            const tVal = timeToDecimal(tStr || '');
            
            if (tVal !== null) {
                if (!trainRawMap.has(l.train_number)) {
                    trainRawMap.set(l.train_number, []);
                }
                trainRawMap.get(l.train_number)?.push({
                    line: l,
                    timeVal: tVal
                });
            }
        });

        // 2. Filter and prepare series data
        const relevantStations = new Set(stations);
        const trainSeriesMap = new Map<string, any[]>();
        const trainNumbersSet = new Set<string>();

        trainRawMap.forEach((stops, trainNum) => {
            // Sort stops by time
            stops.sort((a, b) => a.timeVal - b.timeVal);
            
            if (stops.length === 0) return;

            // "The diagram... showing the first station, intermediate station n... and finally the last"
            // Filter trains: Only include if they pass through at least one of the configured 'intermediate' stations?
            // Or if the user configured a list of stations, maybe they want to see ALL trains that touch that partial route.
            // const hasRelevantStop = stops.some(s => relevantStations.has(s.line.station_track));
            // if (!hasRelevantStop) return;

            trainNumbersSet.add(trainNum);

            // Identify Key Points: Start, End, and Relevant Intermediates
            // "The line for the respective train should display the name... only for the first, intermediate and last stations."
            const startIdx = 0;
            const endIdx = stops.length - 1;

            const keptStops = stops.filter((s, index) => {
                const isStart = index === startIdx;
                const isEnd = index === endIdx;
                const isRelevant = relevantStations.has(s.line.station_track);
                return isStart || isEnd || isRelevant;
            });

            // Determine effective Y-axis train number (Apply Mapping)
            // If this train is mapped to another, use the target for Y coordinates
            const effectiveYTrain = mappings[trainNum] || trainNum;

            const points = keptStops.map(s => ({
                value: [s.timeVal, effectiveYTrain], // [X, Y] - Use effective Y
                stationName: s.line.station_track,
                timeStr: decimalToTime(s.timeVal)
            }));
            
            // Note: We create the series under the ORIGINAL train name to keep the label correct, 
            // but the data points are plotted on the EFFECTIVE train's row.
            trainSeriesMap.set(trainNum, points);
        });

        // 3. Sort Train Numbers (Y-Axis)
        // User requested Train Numbers on Y Axis.
        // Rule: Exclude trains that are mapped (hidden from Y axis labels)
        const visibleTrains = Array.from(trainNumbersSet).filter(t => !mappings[t]);
        
        const trainNumbers = visibleTrains.sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        // 4. Build Series
        const series: any[] = Array.from(trainNumbersSet).map(trainNum => { // Iterate ALL trains, not just Y-axis visible ones
            const data = trainSeriesMap.get(trainNum) || [];
            
            // Is this train mapped (merged into another row)?
            const isGuest = !!mappings[trainNum];

            return {
                name: trainNum,
                type: 'line',
                data: data,
                symbol: 'rect',
                symbolSize: [2, 10],
                lineStyle: {
                    width: 2
                },

                label: {
                    show: true,
                    position: 'top',
                    formatter: (params: any) => {
                        const { stationName, timeStr } = params.data;
                        return `${stationName}\n${timeStr}`;
                    },
                    fontSize: shiftSettings.labelFontSize,
                    distance: 4,
                    align: 'center',
                    verticalAlign: 'bottom',
                    lineHeight: shiftSettings.labelFontSize + 3
                },
                labelLayout: { moveOverlap: 'shiftX' },
                labelLine: {
                    show: true,
                    smooth: true,
                    length2: 6,
                    lineStyle: { color: '#aaa', width: 1, type: 'dashed' },
                },
            };
        });

        // 5. Build shift block custom series
        if (shiftBlocks.length > 0) {
            // Include blocks for both visible trains and mapped (merged) trains.
            // For a mapped train A→B, the block appears on B's Y-axis row.
            const trainNumberSet = new Set(trainNumbers);
            const allKnownTrains = new Set(trainNumbersSet); // includes mapped trains

            const resolvedBlocks = shiftBlocks
                .filter(b => allKnownTrains.has(b.trainNumber))
                .map(b => {
                    const effectiveTrainNumber = mappings[b.trainNumber] || b.trainNumber;
                    // Only include if the effective row exists on the Y-axis
                    if (!trainNumberSet.has(effectiveTrainNumber)) return null;
                    return { ...b, effectiveTrainNumber };
                })
                .filter(Boolean) as (ShiftBlock & { effectiveTrainNumber: string })[];

            // Merge adjacent/overlapping blocks with the same shift code on the same row.
            // This handles merged trains that share a contiguous shift assignment.
            const GAP_TOLERANCE = 0.25; // hours (15 min)
            const mergedBlocks: (ShiftBlock & { effectiveTrainNumber: string })[] = [];
            // Group by effectiveTrainNumber + shiftCode
            const groupMap = new Map<string, (ShiftBlock & { effectiveTrainNumber: string })[]>();
            for (const block of resolvedBlocks) {
                const key = `${block.effectiveTrainNumber}||${block.shiftCode}`;
                const group = groupMap.get(key);
                if (group) group.push(block);
                else groupMap.set(key, [block]);
            }
            for (const group of groupMap.values()) {
                group.sort((a, b) => a.startTime - b.startTime);
                let current = { ...group[0] };
                for (let i = 1; i < group.length; i++) {
                    const next = group[i];
                    if (next.startTime - current.endTime <= GAP_TOLERANCE) {
                        // Extend current block to cover next
                        current = { ...current, endTime: Math.max(current.endTime, next.endTime) };
                    } else {
                        mergedBlocks.push(current);
                        current = { ...next };
                    }
                }
                mergedBlocks.push(current);
            }

            if (mergedBlocks.length > 0) {
                const shiftSeriesData = mergedBlocks.map((block) => {
                    const overrideColor = shiftSettings.colorOverrides[block.shiftCode];
                    return {
                        value: [block.startTime, block.effectiveTrainNumber, block.endTime, block.shiftCode, overrideColor || block.color],
                        itemStyle: { color: overrideColor || block.color },
                    };
                });

                series.push({
                    name: 'Смени',
                    type: 'custom',
                    data: shiftSeriesData,
                    renderItem: (params: any, api: any) => {
                        const startX = api.coord([api.value(0), api.value(1)]);
                        const endX = api.coord([api.value(2), api.value(1)]);

                        if (!startX || !endX) return;

                        const categoryWidth = api.size([0, 1])[1];
                        const rectHeight = categoryWidth * (shiftSettings.blockHeight / 100);
                        const yCenter = startX[1];
                        const rectY = yCenter + shiftSettings.blockOffset;
                        const rectWidth = Math.max(endX[0] - startX[0], 2);

                        const blockColor = api.value(4) || api.visual('color') || '#999';

                        return {
                            type: 'group',
                            children: [
                                {
                                    type: 'rect',
                                    shape: { x: startX[0], y: rectY, width: rectWidth, height: rectHeight },
                                    style: {
                                        fill: blockColor,
                                        opacity: shiftSettings.blockOpacity,
                                        stroke: '#555',
                                        lineWidth: 0.5,
                                    },
                                },
                                {
                                    type: 'text',
                                    style: {
                                        x: startX[0] + rectWidth / 2,
                                        y: rectY + rectHeight / 2,
                                        text: String(api.value(3)),
                                        textAlign: 'center',
                                        textVerticalAlign: 'middle',
                                        fill: '#fff',
                                        fontSize: Math.min(shiftSettings.codeFontSize, rectWidth / 5),
                                        fontWeight: 'bold',
                                        textShadowColor: 'rgba(0,0,0,0.5)',
                                        textShadowBlur: 2,
                                    },
                                },
                            ],
                        };
                    },
                    encode: { x: [0, 2], y: 1 },
                    clip: true,
                    z: 5,
                    tooltip: {
                        formatter: (params: any) => {
                            const [start, trainNum, end, code] = params.value;
                            return `Смяна: <b>${code}</b><br/>Влак: ${trainNum}<br/>${decimalToTime(start)} – ${decimalToTime(end)}`;
                        },
                    },
                });
            }
        }

        return {
            title: { text: title, left: 'center' },
            tooltip: {
                trigger: 'item',
                 formatter: (params: any) => {
                     return `Влак: ${params.seriesName}<br/>${params.data.stationName}<br/>${params.data.timeStr}`;
                 }
            },
            grid: {
                left: 100, // Space for train numbers Y
                right: 50,
                // Increase top padding to accommodate multiline labels
                top: 80,
                bottom: 50,
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Час',
                min: 4,     // 04:00
                max: 25,    // 01:00 next day
                interval: 1,
                axisLabel: {
                    formatter: (val: number) => decimalToTime(val)
                }
            },
            yAxis: {
                type: 'category',
                name: 'Влак',
                data: trainNumbers,
                inverse: true, // Ascending order top-to-bottom
                axisLabel: { fontSize: 11 },
            },
            dataZoom: [
                { type: 'slider', xAxisIndex: 0, filterMode: 'none' },
                { type: 'slider', yAxisIndex: 0, filterMode: 'empty', right: 10 },
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' }
            ],
            series: series,
            // Removed legend as requested
            legend: { show: false },
            toolbox: {
                feature: {
                    myShiftSchedule: {
                        show: shiftSchedules.length > 0,
                        title: selectedShiftScheduleId ? 'Смени (активно)' : 'Покажи смени',
                        icon: 'path://M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
                        onclick: () => {
                            handleOpenShiftDialog();
                        },
                        iconStyle: selectedShiftScheduleId ? { borderColor: '#1976d2', color: '#1976d2' } : {},
                    },
                    myPrint: {
                        show: true,
                        title: 'Печат',
                        icon: 'path://M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
                        onclick: () => { setPrintDialogOpen(true); },
                    },
                    myFullScreen: {
                        show: true,
                        title: 'Цял екран',
                        icon: 'path://M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
                        onclick: () => {
                             if (chartContainerRef.current) {
                                 if (!document.fullscreenElement) {
                                     chartContainerRef.current.requestFullscreen().catch((err) => {
                                         console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                                     });
                                 } else {
                                     document.exitFullscreen();
                                 }
                             }
                        }
                    },
                    mySaveAsImage: {
                        show: true,
                        title: 'Запиши като картинка',
                        icon: 'path://M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z',
                        onclick: () => { handleSaveAsImage(); },
                    },
                    restore: { title: 'Възстанови' },
                    dataZoom: { title: { zoom: 'Увеличение', back: 'Назад' } }
                },
                top: 0,
                right: 20
            } 
        };

    }, [lines, stations, title, mappings, shiftBlocks, shiftSchedules, selectedShiftScheduleId, handleOpenShiftDialog, handleSaveAsImage, shiftSettings]);

    return (
        <React.Fragment>
            <Box
                ref={chartContainerRef}
                sx={{
                    display: 'flex',
                    gap: 1,
                    width: '100%',
                    height: isFullScreen ? '100vh' : height,
                    backgroundColor: 'white',
                    padding: isFullScreen ? '20px' : '0',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* Left: scrollable controls panel — hidden in fullscreen */}
                {!isFullScreen && (
                    <Box sx={{
                        width: 300,
                        flexShrink: 0,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        pr: 0.5,
                    }}>
                        <Accordion sx={{ boxShadow: 1, border: '1px solid #ddd' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TransformIcon color="primary" fontSize="small" />
                                        <Typography variant="body2">Обединяване на влакове</Typography>
                                    </Box>
                                    <Box onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            startIcon={<SaveIcon />}
                                            size="small"
                                            variant={hasChanges ? "contained" : "outlined"}
                                            onClick={handleSaveConfiguration}
                                            disabled={!scheduleId}
                                        >
                                            {hasChanges ? 'Запази' : 'Запазено'}
                                        </Button>
                                    </Box>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Влак за преместване</InputLabel>
                                        <Select
                                            value={sourceTrain}
                                            label="Влак за преместване"
                                            onChange={(e) => setSourceTrain(e.target.value)}
                                        >
                                            {allTrainNumbers.map(tn => (
                                                <MenuItem key={tn} value={tn}>{tn}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Прикачи към ред на влак</InputLabel>
                                        <Select
                                            value={targetTrain}
                                            label="Прикачи към ред на влак"
                                            onChange={(e) => setTargetTrain(e.target.value)}
                                        >
                                            {allTrainNumbers.map(tn => (
                                                <MenuItem key={tn} value={tn}>{tn}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleAddMapping}
                                        disabled={!sourceTrain || !targetTrain || sourceTrain === targetTrain}
                                    >
                                        Обедини
                                    </Button>

                                    {Object.keys(mappings).length > 0 && (
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {Object.entries(mappings).map(([source, target]) => (
                                                <Chip
                                                    key={source}
                                                    label={`${source} → ${target}`}
                                                    onDelete={() => handleRemoveMapping(source)}
                                                    color="primary"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </Box>
                            </AccordionDetails>
                        </Accordion>

                        {shiftBlocks.length > 0 && (
                            <Accordion sx={{ boxShadow: 1, border: '1px solid #ddd' }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TuneIcon color="primary" fontSize="small" />
                                        <Typography variant="body2">Настройки на смените</Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption">Отстояние между осите (px/ред)</Typography>
                                            <Slider
                                                value={shiftSettings.rowSpacing}
                                                min={30} max={120} step={5}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                marks={[{ value: 30, label: '30' }, { value: 50, label: '50' }, { value: 120, label: '120' }]}
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, rowSpacing: v as number })}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption">Отстояние на блок под оста (px)</Typography>
                                            <Slider
                                                value={shiftSettings.blockOffset}
                                                min={0} max={30} step={1}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, blockOffset: v as number })}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption">Височина на блок (%)</Typography>
                                            <Slider
                                                value={shiftSettings.blockHeight}
                                                min={20} max={90} step={1}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, blockHeight: v as number })}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption">Прозрачност</Typography>
                                            <Slider
                                                value={shiftSettings.blockOpacity}
                                                min={0.1} max={1} step={0.05}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, blockOpacity: v as number })}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption">Шрифт — етикети станции (px)</Typography>
                                            <Slider
                                                value={shiftSettings.labelFontSize}
                                                min={6} max={14} step={1}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                marks={[{ value: 6, label: '6' }, { value: 9, label: '9' }, { value: 14, label: '14' }]}
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, labelFontSize: v as number })}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption">Шрифт — кодове в блоковете (px)</Typography>
                                            <Slider
                                                value={shiftSettings.codeFontSize}
                                                min={6} max={14} step={1}
                                                valueLabelDisplay="auto"
                                                size="small"
                                                marks={[{ value: 6, label: '6' }, { value: 9, label: '9' }, { value: 14, label: '14' }]}
                                                onChange={(_, v) => saveShiftSettings({ ...shiftSettings, codeFontSize: v as number })}
                                            />
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => saveShiftSettings(DEFAULT_SETTINGS)}
                                        >
                                            По подразбиране
                                        </Button>

                                        <Box>
                                            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Цветове на смените</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {Array.from(new Set(shiftBlocks.map(b => b.shiftCode))).sort().map(code => {
                                                    const defaultColor = shiftBlocks.find(b => b.shiftCode === code)?.color || '#999';
                                                    const currentColor = shiftSettings.colorOverrides[code] || defaultColor;
                                                    return (
                                                        <Box key={code} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <input
                                                                type="color"
                                                                value={currentColor}
                                                                onChange={(e) => {
                                                                    saveShiftSettings({ ...shiftSettings, colorOverrides: { ...shiftSettings.colorOverrides, [code]: e.target.value } });
                                                                }}
                                                                style={{ width: 24, height: 24, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                                                            />
                                                            <Typography variant="caption">{code}</Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </Box>
                )}

                {/* Right: chart — scrollable when dynamic height exceeds container */}
                <Box sx={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto' }}>
                    <ReactECharts ref={echartsRef} option={option} style={{ height: isFullScreen ? '100%' : dynamicChartHeight, width: '100%' }} />
                </Box>
            </Box>

            <Snackbar
                open={showSaveSuccess}
                autoHideDuration={4000}
                onClose={() => setShowSaveSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setShowSaveSuccess(false)} severity="success" sx={{ width: '100%' }}>
                    Настройките за обединяване са запазени успешно!
                </Alert>
            </Snackbar>

            <Dialog open={shiftDialogOpen} onClose={() => setShiftDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Избор на график на смените</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>График на смените</InputLabel>
                        <Select
                            value={pendingScheduleId}
                            label="График на смените"
                            onChange={(e) => setPendingScheduleId(e.target.value)}
                        >
                            {shiftSchedules.map(s => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleShiftDialogClear} color="warning">Изчисти</Button>
                    <Button onClick={() => setShiftDialogOpen(false)}>Отказ</Button>
                    <Button onClick={handleShiftDialogConfirm} variant="contained" disabled={!pendingScheduleId}>Приложи</Button>
                </DialogActions>
            </Dialog>

            {/* ── Print dialog ───────────────────────────────────────────── */}
            <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Печат на диаграмата</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Формат</InputLabel>
                            <Select
                                value={printFormat}
                                label="Формат"
                                onChange={(e) => setPrintFormat(e.target.value as typeof printFormat)}
                            >
                                <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
                                <MenuItem value="A3">A3 (297 × 420 mm)</MenuItem>
                                <MenuItem value="A2">A2 (420 × 594 mm)</MenuItem>
                                <MenuItem value="A1">A1 (594 × 841 mm)</MenuItem>
                                <MenuItem value="A0">A0 (841 × 1189 mm)</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Ориентация</InputLabel>
                            <Select
                                value={printOrientation}
                                label="Ориентация"
                                onChange={(e) => setPrintOrientation(e.target.value as typeof printOrientation)}
                            >
                                <MenuItem value="landscape">Хоризонтална (Landscape)</MenuItem>
                                <MenuItem value="portrait">Вертикална (Portrait)</MenuItem>
                            </Select>
                        </FormControl>

                        <Box>
                            <Typography variant="caption">
                                Качество (мащаб на пикселите): {printScale}×
                            </Typography>
                            <Slider
                                value={printScale}
                                min={1} max={4} step={1}
                                marks={[
                                    { value: 1, label: '1×' },
                                    { value: 2, label: '2×' },
                                    { value: 3, label: '3×' },
                                    { value: 4, label: '4×' },
                                ]}
                                valueLabelDisplay="auto"
                                size="small"
                                onChange={(_, v) => setPrintScale(v as number)}
                            />
                            <Typography variant="caption" color="text.secondary">
                                По-висока стойност = по-голям файл, по-добро качество
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintDialogOpen(false)}>Отказ</Button>
                    <Button onClick={handlePrint} variant="contained" startIcon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                        </svg>
                    }>Печат</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
};
