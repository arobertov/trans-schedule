import { 
    Show, 
    SimpleShowLayout, 
    useRecordContext,
    useGetManyReference,
} from 'react-admin';
import { Box, CircularProgress, Typography } from '@mui/material';
import { TimeDistanceChart } from '../graphic-schedule/TimeDistanceChart';

const DiagramView = () => {
    const record = useRecordContext();
    if (!record) return null;

    // 1. Get the Schedule ID from the record
    // Since record.trainSchedule might be an IRI or object depending on normalization
    const scheduleId = typeof record.trainSchedule === 'object' ? record.trainSchedule.id : record.trainSchedule;
    
    // Clean ID if it is an IRI
    const cleanScheduleId = scheduleId && String(scheduleId).split('/').pop();

    if (!cleanScheduleId) return <Typography>Изберете разписание</Typography>;

    // 2. Fetch lines for this schedule
    // We need ALL lines to plot the graph efficiently? 
    // Or do we only need lines matching the stations?
    // Filtering on server side by station list is hard with standard API Platform filters (unless we implement custom filter).
    // So we fetch all lines (pagination 10000) for this schedule.
    const { data: lines, isLoading, error } = useGetManyReference(
        'train_schedule_lines',
        { 
            target: 'trainSchedule', 
            id: cleanScheduleId,
            pagination: { page: 1, perPage: 10000 }, 
            sort: { field: 'train_number', order: 'ASC' } 
        }
    );

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
