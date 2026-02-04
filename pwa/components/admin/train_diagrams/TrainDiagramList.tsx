import { Datagrid, List, TextField, ArrayField, SingleFieldList, ChipField, FunctionField } from "react-admin";

export const TrainDiagramList = () => (
  <List>
    <Datagrid>
      <TextField source="train_number" label="Влак" />
      <TextField source="start_station" label="Начална станция" />
      <TextField source="end_station" label="Крайна станция" />
      <ArrayField source="intermediate_stations" label="Междинни станции">
         <SingleFieldList>
             {/* Handling array of strings directly */}
             <FunctionField render={(record: any) => <span>{record}</span>} />
         </SingleFieldList>
      </ArrayField>
    </Datagrid>
  </List>
);
