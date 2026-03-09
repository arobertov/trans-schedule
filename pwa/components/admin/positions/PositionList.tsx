import { List, Datagrid, NumberField, TextField } from "react-admin";

export const PositionsList = () => (
    <List>
        <Datagrid rowClick="show">
            <TextField source="name" label="Длъжност"/>
            <NumberField source="employees.length"  label="Брой служители"/>
            <TextField source="description" label="Описание"/>
        </Datagrid>
    </List>
);