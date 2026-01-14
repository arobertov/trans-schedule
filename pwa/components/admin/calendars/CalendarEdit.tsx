import { Edit, SimpleForm, NumberInput } from 'react-admin';

export const CalendarEdit = () => (
    <Edit redirect="show" title="Редактиране">
        <SimpleForm>
            <NumberInput source="year" disabled />
        </SimpleForm>
    </Edit>
);
