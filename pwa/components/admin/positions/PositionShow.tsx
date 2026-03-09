import { Show, SimpleShowLayout, NumberField, TextField } from "react-admin";

export const PositionsShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="name" label="Длъжност"/>
            <NumberField source="employees.length"  label="Брой служители"/>
            <TextField source="description" label="Описание"/>
        </SimpleShowLayout>
    </Show>
);
