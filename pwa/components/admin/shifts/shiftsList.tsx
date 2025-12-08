import { FieldGuesser } from "@api-platform/admin";
import { List, Datagrid, FunctionField, useListContext, TopToolbar, CreateButton, Button } from "react-admin";
import { Link } from 'react-router-dom';
import UploadIcon from '@mui/icons-material/Upload';
import { Box, Typography } from '@mui/material';


const RowNumberField = ({ source, label, record, data, align, ...props }: { source?: string; label?: string; record?: any; data?: any[]; align?: string }) => {
    // Взимаме контекста на списъка, за да разберем на коя страница сме
    const { page, perPage } = useListContext();
    
    // 1. Намираме индекса на текущия ред в масива 'data'
    const index = data?.findIndex(item => item.id === record.id) ?? -1;
    //console.log(data, record, index);
    if (index === -1) {
        return '-';
    }

    // 2. Изчисляваме стартовия номер на текущата страница
    // (page - 1) * perPage
    const offset = (page - 1) * perPage;
    
    // 3. Краен пореден номер = offset + index + 1
    return offset + index + 1;
};

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
    <List actions={<ListActions />} empty={<Empty />}>
        <Datagrid>
            <RowNumberField label="№" align="center" />
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
