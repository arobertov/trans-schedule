import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  BooleanField,
  Datagrid,
  ArrayField,
} from "react-admin";
import { PatternDetailsManager } from "./PatternDetailsManager";

export const PatternShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" label="Наименование" />
      <NumberField source="total_positions" label="Брой позиции" />
      <BooleanField source="is_active" label="Активен" />
      <TextField source="description" label="Описание" />
      <ArrayField source="columns" label="Колони">
        <Datagrid bulkActionButtons={false}>
          <NumberField source="column_number" label="№" />
          <TextField source="column_name" label="Име" />
          <TextField source="label" label="Етикет" />
          <TextField source="description" label="Описание" />
        </Datagrid>
      </ArrayField>
      
      <PatternDetailsManager />
    </SimpleShowLayout>
  </Show>
);