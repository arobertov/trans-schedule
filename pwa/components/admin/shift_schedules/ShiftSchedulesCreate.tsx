import { Create, SimpleForm, TextInput } from "react-admin";

export const ShiftSchedulesCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" label="Име на графика за смените" fullWidth />
            <TextInput source="description" label="Описание на графика за смените" fullWidth multiline />
        </SimpleForm>
    </Create>
);
