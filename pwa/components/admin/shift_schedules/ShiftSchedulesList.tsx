import { FieldGuesser } from "@api-platform/admin";
import { List, Datagrid, useListContext, useRecordContext, TopToolbar, CreateButton, Button, Identifier } from "react-admin";
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import UploadIcon from '@mui/icons-material/Upload';

const ListActions = () => (
    <TopToolbar>
        <CreateButton />
        <Button
            component={Link}
            to="/shift_schedules/bulk-import"
            label="Масов импорт"
            icon={<UploadIcon />}
        />
    </TopToolbar>
);

const Empty = () => (
    <Box textAlign="center" m={4}>
        <Typography variant="h6" paragraph color="textSecondary">
            Няма въведени графици за смяна!
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Можете да създадете график за смяна, като кликнете на бутона "Създай" по-долу!
        </Typography>
        <Box mt={2} display="flex" gap={2} justifyContent="center">
            {/* without the bulk import button, as it doesn't make sense to show it when there are no records */}
            <CreateButton />
        </Box>
    </Box>
);

const RowNumberField = () => {
    const record = useRecordContext();
    const { ids = [], page, perPage } = useListContext();
    const recordId = record?.id;
    const index = recordId == null ? -1 : ids.findIndex((id: Identifier) => String(id) === String(recordId));
    if (index === -1) return <span>-</span>;
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
            <FieldGuesser source="name" label="Име на графика за смените" />
            <FieldGuesser source="description" label="Описание на графика за смените" />
            <FieldGuesser source="created_at" label="Създаден на" />
        </Datagrid>
    </List>
);
