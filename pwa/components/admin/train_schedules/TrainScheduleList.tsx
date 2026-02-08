import { Datagrid, List, TextField, TextInput } from "react-admin";

const filters = [
  <TextInput source="name" label="Търсене по име" alwaysOn />,
];

export const TrainScheduleList = () => (
  <List filters={filters}>
    <Datagrid rowClick="show">
      <TextField source="name" label="Име" />
      <TextField source="description" label="Описание" />
    </Datagrid>
  </List>
);
