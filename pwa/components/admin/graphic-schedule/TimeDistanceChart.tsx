import React, { useMemo, useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Snackbar, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TransformIcon from '@mui/icons-material/Transform';
import SaveIcon from '@mui/icons-material/Save';

interface ScheduleLine {
    id: number;
    train_number: string;
    station_track: string;
    arrival_time?: string;
    departure_time?: string;
}

interface Props {
    lines: ScheduleLine[];
    stations: string[]; // Ordered list of key stations to display labels for
    height?: string;
    title?: string;
    scheduleId?: string | number;
}

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

export const TimeDistanceChart = ({ lines, stations, height = '800px', title = 'График Движение', scheduleId }: Props) => {
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [savedMappingsString, setSavedMappingsString] = useState<string>('{}');
    const [sourceTrain, setSourceTrain] = useState('');
    const [targetTrain, setTargetTrain] = useState('');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

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
        const series = Array.from(trainNumbersSet).map(trainNum => { // Iterate ALL trains, not just Y-axis visible ones
            const data = trainSeriesMap.get(trainNum) || [];
            
            // Is this train mapped (merged into another row)?
            const isGuest = !!mappings[trainNum];

            return {
                name: trainNum,
                type: 'line',
                data: data,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    width: 2
                },

                label: {
                    show: true,
                    position: 'top',
                    formatter: (params: any) => {
                        const { stationName, timeStr } = params.data;
                        // Revert to clean label: just Station and Time
                        // The Train Number is now handled by markPoint (start label) for guests
                        // or Y-axis for normal trains.
                        return `${stationName}\n${timeStr}`;
                    },
                    fontSize: 10,
                    distance: 5,
                    align: 'center',
                    verticalAlign: 'bottom',
                    lineHeight: 14
                }
            };
        });

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
                inverse: true // Ascending order top-to-bottom
            },
            dataZoom: [
                { type: 'slider', xAxisIndex: 0, filterMode: 'empty' },
                { type: 'slider', yAxisIndex: 0, filterMode: 'empty', right: 10 },
                { type: 'inside', xAxisIndex: 0, filterMode: 'empty' },
                { type: 'inside', yAxisIndex: 0, filterMode: 'empty' }
            ],
            series: series,
            // Removed legend as requested
            legend: { show: false },
            toolbox: {
                feature: {
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
                    saveAsImage: { title: 'Запиши като картинка' },
                    restore: { title: 'Възстанови' },
                    dataZoom: { title: { zoom: 'Увеличение', back: 'Назад' } }
                },
                top: 0,
                right: 20
            } 
        };

    }, [lines, stations, title, mappings]); // Add mappings to dependency array

    return (
        <React.Fragment>
             <Accordion sx={{ mb: 2, boxShadow: 1, border: '1px solid #ddd' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TransformIcon color="primary" />
                            <Typography>Обединяване на влакове</Typography>
                        </Box>
                        <Box onClick={(e) => e.stopPropagation()}>
                            <Button 
                                startIcon={<SaveIcon />} 
                                size="small" 
                                variant={hasChanges ? "contained" : "outlined"} 
                                onClick={handleSaveConfiguration}
                                disabled={!scheduleId}
                            >
                                {hasChanges ? 'Запази промените' : 'Запази настройките'}
                            </Button>
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
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
                        
                        <Typography variant="body2">→</Typography>

                        <FormControl size="small" sx={{ minWidth: 200 }}>
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
                            onClick={handleAddMapping}
                            disabled={!sourceTrain || !targetTrain || sourceTrain === targetTrain}
                        >
                            Обедини
                        </Button>
                    </Box>

                    {Object.keys(mappings).length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {Object.entries(mappings).map(([source, target]) => (
                                <Chip 
                                    key={source} 
                                    label={`${source} → ${target}`} 
                                    onDelete={() => handleRemoveMapping(source)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    )}
                </AccordionDetails>
            </Accordion>
            
            <div 
                ref={chartContainerRef} 
                style={{ 
                    width: '100%', 
                    height: isFullScreen ? '100vh' : height, 
                    backgroundColor: 'white',
                    padding: isFullScreen ? '20px' : '0'
                }}
            >
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
            </div>
            
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
        </React.Fragment>
    );
};
