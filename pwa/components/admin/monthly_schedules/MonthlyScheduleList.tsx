import { Datagrid, List, NumberField, ReferenceField, TextField, EditButton, TextInput, ReferenceInput, SelectInput, FunctionField } from "react-admin";

const listFilters = [
    <ReferenceInput source="position" reference="positions" alwaysOn>
        <SelectInput optionText="name" label="Длъжност" />
    </ReferenceInput>,
    <TextInput source="year" label="Година" alwaysOn />,
    <TextInput source="month" label="Месец" alwaysOn />,
];

const getMonthName = (month: number) => {
    if (!month) return "";
    const date = new Date();
    date.setMonth(month - 1);
    const monthName = date.toLocaleString('bg-BG', { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
};

export const MonthlyScheduleList = () => (
    <List filters={listFilters} sort={{ field: 'id', order: 'DESC' }}>
        <Datagrid rowClick="edit">
            <ReferenceField source="position" reference="positions" label="Длъжност">
                <TextField source="name" />
            </ReferenceField>
            <NumberField source="year" label="Година" />
            <FunctionField 
                label="Месец" 
                render={(record: any) => getMonthName(record.month)} 
            />
            <TextField source="status" label="Статус" />
            <NumberField source="working_days" label="Раб. дни" />
            <NumberField source="working_hours" label="Раб. часове" />
            <EditButton />
        </Datagrid>
    </List>
);
