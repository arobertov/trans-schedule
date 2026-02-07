import { Create, SimpleForm, TextInput, ReferenceInput, SelectInput, ArrayInput, SimpleFormIterator } from "react-admin";

export const TrainDiagramCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Име на диаграма" fullWidth />
      <ReferenceInput source="trainSchedule" reference="train_schedules">
        <SelectInput optionText="name" label="Разписание" fullWidth />
      </ReferenceInput>
      <ArrayInput source="stations" label="Станции (в последователност)">
        <SimpleFormIterator>
          <TextInput source="" label="Име на станция" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);
