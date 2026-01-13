import { Edit, SimpleForm, TextInput, NumberInput, SelectInput, ReferenceInput, required, useRecordContext } from "react-admin";
import { MonthlyScheduleGrid } from "./MonthlyScheduleGrid";
import { Box, Typography } from "@mui/material";

const ScheduleTitle = () => {
    const record = useRecordContext();
    return <span>График {record ? `"${record.year}-${record.month}"` : ''}</span>;
}

export const MonthlyScheduleEdit = () => (
    <Edit title={<ScheduleTitle />}>
        <SimpleForm>
            <Box display="flex" gap={2}>
                 <ReferenceInput source="position" reference="positions" >
                    <SelectInput optionText="name" label="Длъжност" disabled />
                </ReferenceInput>
                <NumberInput source="year" label="Година" disabled />
                <NumberInput source="month" label="Месец" disabled />
                <SelectInput source="status" choices={[
                    { id: 'чернова', name: 'Чернова' },
                    { id: 'утвърден', name: 'Утвърден' },
                    { id: 'архивиран', name: 'Архивиран' },
                ]} label="Статус" />
            </Box>
             <Box display="flex" gap={2}>
                <NumberInput source="working_days" label="Работни дни" />
                <NumberInput source="working_hours" label="Работни часове" />
                <TextInput source="description" label="Описание" fullWidth multiline />
            </Box>
            
            <MonthlyScheduleGrid />
        </SimpleForm>
    </Edit>
);
