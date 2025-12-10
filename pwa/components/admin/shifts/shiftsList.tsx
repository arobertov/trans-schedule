import { FieldGuesser } from "@api-platform/admin";
import { List, Datagrid, FunctionField, useListContext, TopToolbar, CreateButton, Button, FilterList, FilterListItem } from "react-admin";
import { Link } from 'react-router-dom';
import UploadIcon from '@mui/icons-material/Upload';
import { Box, Typography, Card, CardContent } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';


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

const ShiftFilters = () => (
    <Card sx={{ order: -1, mr: 2, mt: 6, width: 250 }}>
        <CardContent>
            <FilterList label="Тип смени" icon={<WorkIcon />}>
                <FilterListItem
                    label="Всички"
                    value={{ 'day_type': undefined, 'season': undefined }}
                />
                <FilterListItem
                    label="Делник - Зимен"
                    value={{ 'day_type': 'Делник', 'season': 'Зимен' }}
                />
                <FilterListItem
                    label="Празник - Зимен"
                    value={{ 'day_type': 'Празник', 'season': 'Зимен' }}
                />
                <FilterListItem
                    label="Делник - Летен"
                    value={{ 'day_type': 'Делник', 'season': 'Летен' }}
                />
                <FilterListItem
                    label="Празник - Летен"
                    value={{ 'day_type': 'Празник', 'season': 'Летен' }}
                />
            </FilterList>
        </CardContent>
    </Card>
);

const Empty = () => (
    <Box textAlign="center" m={4}>
        <Typography variant="h6" paragraph color="textSecondary">
            Няма създадени смени
        </Typography>
        <Typography variant="body2" paragraph color="textSecondary">
            Можете да създадете смяна или да импортирате много смени наведнъж
        </Typography>
        <Box mt={2} display="flex" gap={2} justifyContent="center">
            <CreateButton />
            <Button
                component={Link}
                to="/shifts/bulk-import"
                label="Масов импорт от Excel"
                startIcon={<UploadIcon />}
                variant="contained"
            />
        </Box>
    </Box>
);

export const ShiftsList = () => (
    <List 
        actions={<ListActions />} 
        empty={<Empty />}
        aside={<ShiftFilters />}
    >
        <Datagrid>
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
            <FieldGuesser source="shift_code" label="Код на смяна" />
            <FieldGuesser source="day_type" label="Тип ден" />
            <FieldGuesser source="season" label="Сезон" />
            <FunctionField
                source="worked_time"
                label="Отработено време"
                render={(record: any) => record.worked_time || '-'}
            />
            <FunctionField
                source="night_work"
                label="Нощен труд"
                render={(record: any) => record.night_work || '-'}
            />
            <FunctionField
                source="total_time"
                label="Общо време"
                render={(record: any) => record.total_time || '-'}
            />
            <FieldGuesser source="kilometers" label="Километри" />
            <FunctionField
                source="zero_time"
                label="Нулево време"
                render={(record: any) => record.zero_time || '-'}
            />
        </Datagrid>
    </List>
);
