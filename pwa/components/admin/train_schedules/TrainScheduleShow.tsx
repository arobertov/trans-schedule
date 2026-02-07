import { 
    Show, 
    TextField, 
    ReferenceManyField, 
    Datagrid, 
    Pagination,
    TabbedShowLayout,
    Tab,
    useRecordContext,
    SimpleShowLayout,
    useGetManyReference,
    DateField
} from 'react-admin';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ScheduleChart } from '../graphic-schedule/ScheduleChart';
import { TrainListAccordion } from './TrainListAccordion';

const LinesPagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

const ScheduleDiagramTab = () => {
    const record = useRecordContext();
    if (!record) return null;

    const { data, isLoading, error } = useGetManyReference(
        'train_schedule_lines',
        { 
            target: 'trainSchedule', 
            id: record.id, 
            pagination: { page: 1, perPage: 2000 }, 
            sort: { field: 'train_number', order: 'ASC' } 
        }
    );

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Error loading data</Typography>;
    if (!data || data.length === 0) return <Typography sx={{ p: 2 }}>Няма въведени данни за диаграма. Моля импортирайте Excel файл.</Typography>;

    return (
        <Box sx={{ height: '80vh', width: '100%', mt: 2 }}>
            <ScheduleChart lines={data} height="100%" />
        </Box>
    );
};

export const TrainScheduleShow = () => (
    <Show>
        <TabbedShowLayout>
            <Tab label="Графичен График">
                 <ScheduleDiagramTab />
            </Tab>
            <Tab label="Списък Влакове">
                <TrainListAccordion />
            </Tab>
            <Tab label="Таблица с данни">
                <ReferenceManyField 
                    reference="train_schedule_lines" 
                    target="trainSchedule" 
                    pagination={<LinesPagination />}
                    perPage={50} 
                    label=""
                    sort={{ field: 'train_number', order: 'ASC' }}
                >
                    <Datagrid>
                        <TextField source="train_number" label="Влак №" />
                        <TextField source="station_track" label="Станция №/Път №" />
                        <DateField source="arrival_time" label="Пристига" showDate={false} showTime options={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                        <DateField source="departure_time" label="Заминава" showDate={false} showTime options={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                    </Datagrid>
                </ReferenceManyField>
            </Tab>
            <Tab label="Информация">
                <SimpleShowLayout>
                    <TextField source="name" label="Име" />
                    <TextField source="description" label="Описание" />
                </SimpleShowLayout>
            </Tab>
        </TabbedShowLayout>
    </Show>
);
