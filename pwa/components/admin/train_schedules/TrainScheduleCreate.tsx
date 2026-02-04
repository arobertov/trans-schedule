import { Create, SimpleForm, TextInput } from "react-admin";

export const TrainScheduleCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Име" validate={values => values ? undefined : 'Задължително поле'} />
      <TextInput source="description" label="Описание" multiline />
    </SimpleForm>
  </Create>
);
