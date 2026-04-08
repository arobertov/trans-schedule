import { List, Datagrid, useListContext, useRecordContext, TextField, DateField, FunctionField } from "react-admin";
import { Box, Chip, Typography } from '@mui/material';

const Empty = () => (
    <Box textAlign="center" m={4}>
        <Typography variant="h6" paragraph color="textSecondary">
            Няма проектографици!
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Генерирайте график от менюто &quot;Генериране на смени&quot;, за да се появи тук.
        </Typography>
    </Box>
);

const RowNumberField = () => {
    const record = useRecordContext();
    const { data, page, perPage } = useListContext();
    const index = data?.findIndex((item: any) => item.id === record?.id) ?? -1;
    if (index === -1) return '-';
    const offset = (page - 1) * perPage;
    return <span>{offset + index + 1}</span>;
};

export const DraftSchedulesList = () => (
    <List
        resource="shift_schedules"
        filter={{ status: "проект" }}
        storeKey="draftShiftSchedules"
        title="Проектографици"
        empty={<Empty />}
    >
        <Datagrid rowClick={(id) => `/shift-schedules/draft/${id}`}>
            <RowNumberField />
            <TextField source="name" label="Име на графика" />
            <TextField source="description" label="Описание" />
            <FunctionField
              label="Статус"
              render={() => <Chip label="Проект" color="warning" size="small" />}
            />
            <DateField source="created_at" label="Създаден на" showTime />
        </Datagrid>
    </List>
);
