import { 
    Show, 
    SimpleShowLayout, 
    useRecordContext,
    useGetManyReference,
    useGetList,
} from 'react-admin';
import { Box, CircularProgress, Typography } from '@mui/material';
import { TimeDistanceChart, ShiftBlock } from '../graphic-schedule/TimeDistanceChart';
import { useState, useMemo, useEffect, useCallback } from 'react';

const SHIFT_BLOCK_PALETTE = [
    '#1565C0', '#2E7D32', '#E65100', '#AD1457', '#6A1B9A',
    '#00838F', '#BF360C', '#4E342E', '#37474F', '#283593',
    '#558B2F', '#F9A825', '#4527A0', '#00695C', '#C62828',
    '#9E9D24', '#0277BD', '#EF6C00', '#880E4F', '#1B5E20',
];

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
    if (val < 4) val += 24;
    return val;
};

const DiagramView = () => {
    const record = useRecordContext();
    const [selectedShiftScheduleId, setSelectedShiftScheduleId] = useState<string | null>(null);

    const scheduleId = record ? (typeof record.trainSchedule === 'object' ? record.trainSchedule.id : record.trainSchedule) : undefined;
    const cleanScheduleId = scheduleId ? String(scheduleId).split('/').pop() : undefined;

    // Load persisted shift schedule selection
    useEffect(() => {
        if (cleanScheduleId) {
            const saved = localStorage.getItem(`shift_schedule_selection_${cleanScheduleId}`);
            if (saved) setSelectedShiftScheduleId(saved);
        }
    }, [cleanScheduleId]);

    const handleShiftScheduleSelect = useCallback((id: string | null) => {
        setSelectedShiftScheduleId(id);
        if (cleanScheduleId) {
            if (id) {
                localStorage.setItem(`shift_schedule_selection_${cleanScheduleId}`, id);
            } else {
                localStorage.removeItem(`shift_schedule_selection_${cleanScheduleId}`);
            }
        }
    }, [cleanScheduleId]);

    if (!record) return null;
    if (!cleanScheduleId) return <Typography>Изберете разписание</Typography>;

    return (
        <DiagramViewInner
            cleanScheduleId={cleanScheduleId}
            record={record}
            selectedShiftScheduleId={selectedShiftScheduleId}
            onShiftScheduleSelect={handleShiftScheduleSelect}
        />
    );
};

const DiagramViewInner = ({ cleanScheduleId, record, selectedShiftScheduleId, onShiftScheduleSelect }: {
    cleanScheduleId: string;
    record: any;
    selectedShiftScheduleId: string | null;
    onShiftScheduleSelect: (id: string | null) => void;
}) => {
    const { data: lines, isLoading, error } = useGetManyReference(
        'train_schedule_lines',
        { 
            target: 'trainSchedule', 
            id: cleanScheduleId,
            pagination: { page: 1, perPage: 10000 }, 
            sort: { field: 'train_number', order: 'ASC' } 
        }
    );

    const { data: shiftSchedulesRaw } = useGetList('shift_schedules', {
        pagination: { page: 1, perPage: 200 },
        sort: { field: 'name', order: 'ASC' },
    });

    const cleanShiftId = selectedShiftScheduleId ? String(selectedShiftScheduleId).split('/').pop() : undefined;

    const { data: shiftDetails } = useGetManyReference(
        'shift_schedule_details',
        {
            target: 'shift_schedule',
            id: cleanShiftId || '',
            pagination: { page: 1, perPage: 10000 },
            sort: { field: 'shift_code', order: 'ASC' },
        },
        { enabled: !!cleanShiftId }
    );

    const shiftSchedules = useMemo(() => {
        if (!shiftSchedulesRaw) return [];
        return shiftSchedulesRaw.map((s: any) => ({
            id: String(s.id).includes('/') ? String(s.id).split('/').pop()! : String(s.id),
            name: s.name || s.id,
        }));
    }, [shiftSchedulesRaw]);

    const shiftBlocks: ShiftBlock[] = useMemo(() => {
        if (!shiftDetails || shiftDetails.length === 0) return [];

        // Filter out duplicate shifts with Д/П or П/Д suffix
        const filteredDetails = shiftDetails.filter((d: any) => {
            const code = (d.shift_code || '').trim();
            return !/ [ДП]\/[ПД]$/i.test(code);
        });

        // Collect unique shift codes for color assignment
        const uniqueCodes = Array.from(new Set(filteredDetails.map((d: any) => d.shift_code))).sort();
        const codeColorMap = new Map<string, string>();
        uniqueCodes.forEach((code, idx) => {
            codeColorMap.set(code as string, SHIFT_BLOCK_PALETTE[idx % SHIFT_BLOCK_PALETTE.length]);
        });

        const blocks: ShiftBlock[] = [];

        for (const detail of filteredDetails) {
            const routes = detail.routes;
            if (!Array.isArray(routes)) continue;

            for (const route of routes) {
                if (!route || typeof route !== 'object') continue;
                const trainNumber = route.route;
                if (!trainNumber) continue;

                const startStr = route.in_schedule;
                const endStr = route.from_schedule;
                if (!startStr || !endStr) continue;

                const startTime = timeToDecimal(String(startStr));
                const endTime = timeToDecimal(String(endStr));
                if (startTime === null || endTime === null) continue;

                blocks.push({
                    shiftCode: detail.shift_code,
                    trainNumber: String(trainNumber),
                    startTime,
                    endTime,
                    color: codeColorMap.get(detail.shift_code) || '#999',
                });
            }
        }

        return blocks;
    }, [shiftDetails]);

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Грешка при зареждане на разписанието</Typography>;
    if (!lines || lines.length === 0) return <Typography>Няма данни за това разписание</Typography>;

    const stations = record.stations || [];
    if (stations.length === 0) return <Typography>Няма зададени станции за тази диаграма</Typography>;

    return (
        <Box sx={{ height: '80vh', width: '100%', mt: 2 }}>
            <TimeDistanceChart 
                lines={lines} 
                stations={stations} 
                height="100%" 
                title={record.name} 
                scheduleId={cleanScheduleId}
                shiftBlocks={shiftBlocks}
                shiftSchedules={shiftSchedules}
                selectedShiftScheduleId={selectedShiftScheduleId}
                onShiftScheduleSelect={onShiftScheduleSelect}
            />
        </Box>
    );
};

export const TrainDiagramShow = () => (
    <Show>
        <SimpleShowLayout>
            <DiagramView />
        </SimpleShowLayout>
    </Show>
);
