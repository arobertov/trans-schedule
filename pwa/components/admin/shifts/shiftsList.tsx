import { FieldGuesser } from "@api-platform/admin";
import { List, Datagrid, FunctionField, useListContext, TopToolbar, CreateButton, Button, FilterList, FilterListItem, ReferenceField, useGetList } from "react-admin";
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
            icon={<UploadIcon />}
        />
    </TopToolbar>
);
const ShiftFilters = () => {
    const { data: shiftSchedules = [] } = useGetList('shift_schedules', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'name', order: 'ASC' },
    });

    return (
        <Card sx={{ order: -1, mr: 2, mt: 6, width: 280 }}>
            <CardContent>
                <FilterList label="Графици на смените" icon={<WorkIcon />}>
                    <FilterListItem label="Всички" value={{ shift_schedule: undefined }} />
                    {shiftSchedules.map((schedule: any) => (
                        <FilterListItem
                            key={schedule.id}
                            label={schedule.name || `График #${schedule.id}`}
                            value={{ shift_schedule: schedule['@id'] ?? schedule.id }}
                        />
                    ))}
                </FilterList>
            </CardContent>
        </Card>
    );
};

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
                icon={<UploadIcon />}
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

            <ReferenceField source="shift_schedule" reference="shift_schedules" label="График на смените" link="show">
                <FieldGuesser source="name"/>
            </ReferenceField>
            <FieldGuesser source="shift_code" label="Код на смяна" />
            <FunctionField
                source="at_doctor"
                label="При лекар"
                render={(record: any) => record.at_doctor || '-'}
            />
            <FunctionField
                source="at_duty_officer"
                label="При дежурен"
                render={(record: any) => record.at_duty_officer || '-'}
            />
            <FunctionField
                source="shift_end"
                label="Край на смяната"
                render={(record: any) => record.shift_end || '-'}
            />
            <FunctionField
                source="worked_time"
                label="Отработено време"
                render={(record: any) => record.worked_time || '-'}
            />
            <FunctionField
                source="kilometers"
                label="Километри"
                render={(record: any) => record.kilometers || '-'}
            />
            <FunctionField
                source="zero_time"
                label="Нулево време"
                render={(record: any) => record.zero_time || '-'}
            />
        </Datagrid>
    </List>
);
