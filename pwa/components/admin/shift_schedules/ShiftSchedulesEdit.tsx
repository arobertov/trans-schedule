import { Edit, SimpleForm, TextInput } from "react-admin";

export const ShiftSchedulesEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="name" label="Име на графика" fullWidth />
            <TextInput source="description" label="Описание на графика" fullWidth multiline />
        </SimpleForm>
    </Edit>
);
