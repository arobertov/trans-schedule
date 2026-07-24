import { Datagrid, List, TextField, TextInput } from "react-admin";
import { CustomList } from "../../../helpers/CustomList";

const filters = [
  <TextInput source="name" label="Търсене по име" alwaysOn />,
];

export const TrainScheduleList = () => (
  <CustomList filters={filters}>
    <Datagrid rowClick="show">
      <TextField source="name" label="Име" />
      <TextField source="description" label="Описание" />
    </Datagrid>
  </CustomList>
);
