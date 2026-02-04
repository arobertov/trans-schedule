import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useRecordContext } from 'react-admin';

interface ScheduleLine {
    id: number;
    train_number: string;
    station_track: string; // The "Y" axis label? No, user said Y axis is "Numbers 100 to 1".
                           // Wait, "vertical axis is the numbers from 100 to 1".
                           // This implies Train Numbers are on Y axis?
                           // "Horizontal axis is the hours".
                           // So it's a "Train Graph".
                           // Lines go from left to right.
    arrival_time?: string;
    departure_time?: string;
}

interface Props {
    lines: ScheduleLine[];
    height?: string;
}

// Convert "HH:mm" or ISO date string to decimal hours relative to 04:00
// 04:00 -> 4.0
// 23:59 -> 23.98
// 00:00 -> 24.0
// 01:00 -> 25.0
const timeToDecimal = (timeStr: string): number | null => {
    if (!timeStr) return null;
    
    // Handle ISO strings like "1970-01-01T14:30:00+00:00" by extracting HH:mm
    const match = timeStr.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    
    let h = 0, m = 0;
    if (match) {
        h = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
    } else {
        // Fallback split
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

// Inverse: 24.5 -> "00:30"
const decimalToTime = (val: number): string => {
    let normalized = val;
    if (normalized >= 24) normalized -= 24;
    const h = Math.floor(normalized);
    const m = Math.round((normalized - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const ScheduleChart = ({ lines, height = '600px' }: Props) => {
    
    const option = useMemo(() => {
        // 1. Group by Train Number
        const trains: Record<string, ScheduleLine[]> = {};
        const uniqueTrains = new Set<string>();

        lines.forEach(line => {
            if (!trains[line.train_number]) {
                trains[line.train_number] = [];
                uniqueTrains.add(line.train_number);
            }
            trains[line.train_number].push(line);
        });

        // Sort train numbers numeric descending (100 -> 1) or as requested
        // User said: "vertical axis is the numbers from 100 to 1"
        // Echarts category axis usually goes bottom-left to top-left.
        // If we list [1, 2, ... 100], 1 is bottom. 
        // User wants 100 to 1? 
        // Or maybe "100" at top?
        // Let's assume numeric sort.
        const sortedTrainIds = Array.from(uniqueTrains).sort((a, b) => {
             // Try numeric sort
             const numA = parseInt(a);
             const numB = parseInt(b);
             if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
             return a.localeCompare(b);
        });

        // Generate Series
        const series = sortedTrainIds.map(trainId => {
            const trainLines = trains[trainId];
            
            // Sort stops by time
            trainLines.sort((a, b) => {
                const tA = timeToDecimal(a.departure_time || a.arrival_time || '');
                const tB = timeToDecimal(b.departure_time || b.arrival_time || '');
                return (tA || 0) - (tB || 0);
            });

            // Data points: [X, Y]
            // X = time
            // Y = trainId 
            // Wait, if Y is trainID, the line is flat horizontal?
            // "The horizontal axis is the hours... vertical axis is the numbers".
            // If it is a flat line, it's a Gantt chart.
            // But user said "Graph (diagram)".
            // Usually text markers are stations.
            // If Y axis is Train Number, then each train is a row.
            // This is a standard String Chart (Time vs Distance) IF Y is Stations.
            // But user said "Vertical axis is the numbers from 100 to 1".
            // AND "tables imported from Excel" (Train, Place, Time).
            
            // IF Y = Train Number:
            // The graph shows when a train is active.
            // Line from Start Time to End Time at height Y=TrainID.
            // Markers on the line = Stations.
            
            // IF Y = Station (!):
            // Then X = Time.
            // Each line is a Train. Sloped lines showing speed.
            // User requested: "vertical axis is the numbers from 100 to 1".
            // That sounds like pure Train IDs.
            
            // Proceeding with Y = Train ID.
            
            const data = [];
            trainLines.forEach(stop => {
                // We might have Arrival and Departure.
                // Draw a segment? 
                // Line chart connects points.
                if (stop.arrival_time) {
                    const t = timeToDecimal(stop.arrival_time);
                    if (t !== null) data.push([t, trainId, stop.station_track + ' (Arr)']);
                }
                if (stop.departure_time) {
                    const t = timeToDecimal(stop.departure_time);
                    if (t !== null) data.push([t, trainId, stop.station_track + ' (Dep)']);
                }
            });

            return {
                name: trainId,
                type: 'line',
                data: data,
                symbol: 'circle',
                symbolSize: 6,
                label: {
                    show: true,
                    formatter: (param: any) => {
                        // Show Station Name on the point
                        // param.data[2] is our custom payload
                        // Maybe only show specific stations ot avoid clutter?
                        // For now show all.
                        return param.data[2]?.replace(' (Arr)', '').replace(' (Dep)', '') || '';
                    },
                    position: 'top',
                    fontSize: 10,
                    color: '#333'
                },
                lineStyle: {
                    width: 2
                }
            };
        });

        return {
            title: { text: 'График на движение (4:00 - 1:00)' },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `<b>Влак ${params.seriesName}</b><br/>
                            ${params.data[2]}<br/>
                            Час: ${decimalToTime(params.data[0])}`;
                }
            },
            grid: {
                left: '50px',
                right: '50px',
                top: '50px',
                bottom: '50px',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                min: 4,
                max: 25, // 01:00 next day
                interval: 1, // Every hour
                axisLabel: {
                    formatter: (val: number) => decimalToTime(val)
                },
                splitLine: {
                    show: true,
                    lineStyle: { type: 'dashed' }
                },
                name: 'Час'
            },
            yAxis: {
                type: 'category',
                data: sortedTrainIds,
                inverse: true, // 100 at top? If sortedIds is [1..100], inverse puts 1 at top. 
                               // If user wants 100 to 1, and we sort desc?
                               // Let's assume standard visual list: Top is first item.
                name: 'Влак',
                splitLine: { show: true }
            },
            dataZoom: [
                { type: 'inside', xAxisIndex: 0 },
                { type: 'slider', xAxisIndex: 0 },
                { type: 'slider', yAxisIndex: 0, right: 10 }
            ],
            series: series
        };
    }, [lines]);

    return (
        <ReactECharts 
            option={option} 
            style={{ height, width: '100%' }} 
            notMerge={true}
        />
    );
};
