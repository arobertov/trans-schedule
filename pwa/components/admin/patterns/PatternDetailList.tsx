import { List, Datagrid, NumberField, TextField, EditButton, DeleteButton } from "react-admin";

export const PatternDetailList = () => (
  <List>
    <Datagrid>
      <NumberField source="position_number" label="Позиция" />
      <TextField source="pattern.name" label="Порядък" />
      <TextField source="values" label="Стойности (JSON)" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);