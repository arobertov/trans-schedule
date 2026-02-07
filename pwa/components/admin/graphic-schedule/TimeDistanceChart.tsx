import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

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

export const TimeDistanceChart = ({ lines, stations, height = '800px', title = 'График Движение' }: Props) => {
    
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
            const hasRelevantStop = stops.some(s => relevantStations.has(s.line.station_track));
            if (!hasRelevantStop) return;

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

            const points = keptStops.map(s => ({
                value: [s.timeVal, trainNum], // [X, Y]
                stationName: s.line.station_track,
                timeStr: decimalToTime(s.timeVal)
            }));
            
            trainSeriesMap.set(trainNum, points);
        });

        // 3. Sort Train Numbers (Y-Axis)
        // User requested Train Numbers on Y Axis.
        const trainNumbers = Array.from(trainNumbersSet).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        // 4. Build Series
        const series = trainNumbers.map(trainNum => {
            const data = trainSeriesMap.get(trainNum) || [];

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
            legend: { show: false } 
        };

    }, [lines, stations, title]);

    return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
