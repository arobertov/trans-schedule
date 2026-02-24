import { FieldGuesser } from "@api-platform/admin";
import { List, Datagrid, FunctionField, useListContext, TopToolbar, CreateButton, Button } from "react-admin";
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
            Няма създадени графици
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Можете да създадете график или да импортирате такъв
        </Typography>
        <Box mt={2} display="flex" gap={2} justifyContent="center">
            <CreateButton />
            <Button
                component={Link}
                to="/shift_schedules/bulk-import"
                label="Масов импорт от Excel"
                icon={<UploadIcon />}
                variant="contained"
            />
        </Box>
    </Box>
);

const RowNumberField = ({ record }: { record?: any }) => {
    const { data, page, perPage } = useListContext();
    const index = data?.findIndex((item: any) => item.id === record?.id) ?? -1;
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
            <FieldGuesser source="name" label="Име на графика" />
            <FieldGuesser source="created_at" label="Създаден на" />
        </Datagrid>
    </List>
);
