import { Datagrid, List, NumberField, ReferenceField, TextField, EditButton, TextInput, ReferenceInput, SelectInput, DateInput } from "react-admin";

const listFilters = [
    <ReferenceInput source="position" reference="positions" alwaysOn>
        <SelectInput optionText="name" label="Длъжност" />
    </ReferenceInput>,
    <TextInput source="year" label="Година" alwaysOn />,
    <TextInput source="month" label="Месец" alwaysOn />,
];

export const MonthlyScheduleList = () => (
    <List filters={listFilters} sort={{ field: 'id', order: 'DESC' }}>
        <Datagrid rowClick="edit">
            <ReferenceField source="position" reference="positions" label="Длъжност">
                <TextField source="name" />
            </ReferenceField>
            <NumberField source="year" label="Година" />
            <NumberField source="month" label="Месец" />
            <TextField source="status" label="Статус" />
            <NumberField source="working_days" label="Раб. дни" />
            <NumberField source="working_hours" label="Раб. часове" />
            <EditButton />
        </Datagrid>
    </List>
);
