import { Create, SimpleForm, TextInput, ArrayInput, SimpleFormIterator } from "react-admin";

export const TrainDiagramCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="train_number" label="Влак" helperText="За този влак ще бъдат автоматично изчислени Начална и Крайна станция въз основа на разписанието." fullWidth />
      <ArrayInput source="intermediate_stations" label="Междинни станции">
        <SimpleFormIterator>
          {/* Using empty source for array of strings */}
          <TextInput source="" label="Станция" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);
