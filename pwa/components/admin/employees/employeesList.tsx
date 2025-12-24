import { FieldGuesser } from "@api-platform/admin";
import {
    useListContext,
    FunctionField,
    TopToolbar,
    SelectColumnsButton,
    CreateButton,
    Button,
    List,
    DatagridConfigurable
} from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Box, Typography } from '@mui/material';

const ListActions = () => (
    <TopToolbar>
        <SelectColumnsButton />
        <CreateButton />
        <Button
            component={Link}
            to="/employees/bulk-import"
            label="Масов импорт"
            startIcon={<UploadFileIcon />}
        />
    </TopToolbar>
);

const Empty = () => (
    <Box textAlign="center" m={4}>
        <Typography variant="h6" paragraph color="textSecondary">
            Няма създадени служители
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Можете да създадете служител или да импортирате много служители наведнъж
        </Typography>
        <Box mt={2} display="flex" gap={2} justifyContent="center">
            <Button
                variant="contained"
                component={Link}
                to="/employees/create"
                label="Създай служител"
            />
            <Button
                variant="outlined"
                component={Link}
                to="/employees/bulk-import"
                label="Масов импорт"
                startIcon={<UploadFileIcon />}
            />
        </Box>
    </Box>
);

export const EmployeesList = () => (
    <List
        actions={<ListActions />}
        empty={<Empty />}
    >
        <DatagridConfigurable>
            <FunctionField
                label="№"
                render={(record: any) => {
                    const { data, page, perPage } = useListContext();
                    const index = data?.findIndex((item: any) => item.id === record?.id) ?? -1;
                    if (index === -1) return '-';
                    const offset = (page - 1) * perPage;
                    return offset + index + 1;
                }}
                textAlign="center"
            />
            <FieldGuesser source="first_name" label="Име" />
            <FieldGuesser source="middle_name" label="Презиме" />
            <FieldGuesser source="last_name" label="Фамилия" />
            <FieldGuesser source="phone" label="Телефон" />
            <FieldGuesser source="email" label="Имейл" />
            <FieldGuesser source="created_at" label="Добавен на" />
            <FieldGuesser source="updated_at" label="Обновен на" />
            <FieldGuesser source="status" label="Статус" />
            <FunctionField
                label="Длъжност"
                render={(record: any) => record.position?.name || '-'}
            />
        </DatagridConfigurable>
    </List>
);