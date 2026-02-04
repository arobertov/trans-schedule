import { Datagrid, List, TextField, TextInput, ReferenceField } from "react-admin";

const filters = [
  <TextInput source="train_number" label="Влак" alwaysOn />,
  <TextInput source="station_track" label="Гара" alwaysOn />,
];

export const TrainScheduleLineList = () => (
  <List filters={filters} perPage={50}>
    <Datagrid rowClick="edit">
      <ReferenceField source="trainSchedule" reference="train_schedules" label="Разписание">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="train_number" label="Влак" />
      <TextField source="station_track" label="Гара/Коловоз" />
      <TextField source="arrival_time" label="Прист." />
      <TextField source="departure_time" label="Зам." />
    </Datagrid>
  </List>
);
