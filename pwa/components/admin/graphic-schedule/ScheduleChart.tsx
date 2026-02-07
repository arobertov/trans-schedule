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
    height?: string;
}

// Convert "HH:mm" or ISO date string to decimal hours relative to 04:00
const timeToDecimal = (timeStr: string): number | null => {
    if (!timeStr) return null;
    
    // Handle ISO strings like "1970-01-01T14:30:00+00:00"
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
        // Group by Train Number
        const trains: Record<string, ScheduleLine[]> = {};

        lines.forEach(line => {
            if (!trains[line.train_number]) {
                trains[line.train_number] = [];
            }
            trains[line.train_number].push(line);
        });

        // Generate Series for each train (Time vs Station Number)
        const series = Object.keys(trains).map(trainId => {
            const trainLines = trains[trainId];
            
            // Sort stops by time
            trainLines.sort((a, b) => {
                const tA = timeToDecimal(a.departure_time || a.arrival_time || '') || 0;
                const tB = timeToDecimal(b.departure_time || b.arrival_time || '') || 0;
                return tA - tB;
            });

            const data: any[] = [];
            trainLines.forEach(stop => {
                // Parse Station Number from station_track
                // Extract first number found in string, e.g. "12/1" -> 12, "Station 10" -> 10
                const match = stop.station_track && stop.station_track.match(/(\d+)/);
                const stationNum = match ? parseInt(match[0], 10) : NaN;
                
                if (isNaN(stationNum)) return;

                if (stop.arrival_time) {
                    const t = timeToDecimal(stop.arrival_time);
                    if (t !== null) data.push([t, stationNum, stop.station_track]);
                }
                if (stop.departure_time) {
                    const t = timeToDecimal(stop.departure_time);
                    if (t !== null) data.push([t, stationNum, stop.station_track]);
                }
            });

            return {
                name: trainId,
                type: 'line',
                data: data,
                symbol: 'circle',
                symbolSize: 4,
                smooth: false,
                connectNulls: true,
                label: {
                    show: false
                },
                endLabel: {
                    show: true,
                    formatter: '{a}',
                    distance: 10
                },
                lineStyle: {
                    width: 2
                },
                emphasis: {
                    focus: 'series',
                    label: {
                        show: true,
                        formatter: (p: any) => p.seriesName
                    }
                }
            };
        });

        return {
            title: { text: 'График на движение (4:00 - 4:00)' },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `<b>Влак ${params.seriesName}</b><br/>
                            Станция: ${params.data[2]}<br/>
                            Час: ${decimalToTime(params.data[0])}`;
                }
            },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                top: 30
            },
            grid: {
                left: '50px',
                right: '50px',
                top: '70px',
                bottom: '50px',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                min: 4,
                max: 28, // 04:00 next day
                interval: 1, // Every hour
                name: 'Час',
                axisLabel: {
                    formatter: (val: number) => decimalToTime(val)
                },
                splitLine: {
                    show: true,
                    lineStyle: { type: 'dashed' }
                }
            },
            yAxis: {
                type: 'value',
                min: 1,
                max: 100,
                name: 'Станция',
                splitLine: { show: true },
                minInterval: 1
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
