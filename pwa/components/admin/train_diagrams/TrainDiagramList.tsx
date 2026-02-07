import { Datagrid, List, TextField, ArrayField, SingleFieldList, ChipField, ReferenceField } from "react-admin";

export const TrainDiagramList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="name" label="Име" />
      <ReferenceField source="trainSchedule" reference="train_schedules" label="Разписание">
        <TextField source="name" />
      </ReferenceField>
      <ArrayField source="stations" label="Станции">
         <SingleFieldList>
             <ChipField source="" size="small" />
         </SingleFieldList>
      </ArrayField>
    </Datagrid>
  </List>
);
