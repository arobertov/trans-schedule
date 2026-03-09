import {
    useListContext,
    TopToolbar,
    SelectColumnsButton,
    CreateButton,
    Button,
    List,
    DatagridConfigurable,
    ReferenceField,
    FilterList,
    FilterListItem,
    useGetList,
    TextField,
    DateField,
    useRecordContext,
} from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WorkIcon from '@mui/icons-material/Work';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ListActions = () => (
    <TopToolbar>
        <SelectColumnsButton
            label="Колони"
        />
        <CreateButton
            label="Добави служител"
        />
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
                label="Добави служител"
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

const PositionFilters = () => {
    const { data: positions = [] } = useGetList('positions', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'name', order: 'ASC' },
    });

    return (
        <Card sx={{ order: -1, mr: 2, mt: 6, width: 260 }}>
            <CardContent>
                <FilterList label="Длъжности" icon={<WorkIcon />}>
                    <FilterListItem label="Всички" value={{ position: undefined }} />
                    {positions.map((position: any) => (
                        <FilterListItem
                            key={position.id}
                            label={position.name || `Длъжност #${position.id}`}
                            value={{ position: position['@id'] ?? position.id }}
                        />
                    ))}
                </FilterList>
            </CardContent>
        </Card>
    );
};

const RowNumberField = () => {
    const record = useRecordContext();
    const { data, page, perPage } = useListContext();
    const index = data?.findIndex((item: any) => item.id === record?.id) ?? -1;

    if (index === -1) {
        return <span>-</span>;
    }

    const offset = (page - 1) * perPage;

    return <span>{offset + index + 1}</span>;
};

export const EmployeesList = () => (
    <List
        actions={<ListActions />}
        empty={<Empty />}
        aside={<PositionFilters />}
    >
        <DatagridConfigurable>
            <RowNumberField />
            <TextField source="first_name" label="Име" />
            <TextField source="middle_name" label="Презиме" />
            <TextField source="last_name" label="Фамилия" />
            <TextField source="phone" label="Телефон" />
            <TextField source="email" label="Имейл" />
            <DateField source="created_at" label="Добавен на" showTime />
            <DateField source="updated_at" label="Обновен на" showTime />
            <TextField source="status" label="Статус" />
            <ReferenceField source="position" reference="positions" label="Длъжност" link={false} emptyText="-">
                <TextField source="name" />
            </ReferenceField>
        </DatagridConfigurable>
    </List>
);