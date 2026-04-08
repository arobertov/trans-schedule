import { List, Datagrid, useListContext, useRecordContext, TopToolbar, CreateButton, Button, TextField, DateField, FunctionField } from "react-admin";
import { Box, Chip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import UploadIcon from '@mui/icons-material/Upload';

const ListActions = () => (
    <TopToolbar>
        <CreateButton />
        <Button
            component={Link}
            to="/shifts/bulk-import"
            label="Масов импорт"
            startIcon={<UploadIcon />}
        />
    </TopToolbar>
);

const Empty = () => (
    <Box textAlign="center" m={4}>
        <Typography variant="h6" paragraph color="textSecondary">
            Няма въведени графици за смяна!
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Можете да създадете график за смяна, като кликнете на бутона &quot;Създай&quot; по-долу!
        </Typography>
        <Box mt={2} display="flex" gap={2} justifyContent="center">
            {/* without the bulk import button, as it doesn't make sense to show it when there are no records */}
            <CreateButton />
        </Box>
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

export const ShiftSchedulesList = () => (
    <List 
        actions={<ListActions />} 
        empty={<Empty />}
    >
        <Datagrid rowClick="show">
            <RowNumberField />
            <TextField source="name" label="Име на графика за смените" />
            <TextField source="description" label="Описание на графика за смените" />
            <FunctionField
              label="Статус"
              render={(record: any) => {
                const status = record?.status;
                if (status === "активен") return <Chip label="Активен" color="success" size="small" />;
                return <Chip label="Проект" color="warning" size="small" />;
              }}
            />
            <DateField source="created_at" label="Създаден на" showTime />
        </Datagrid>
    </List>
);
