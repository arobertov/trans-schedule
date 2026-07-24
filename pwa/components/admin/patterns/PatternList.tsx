import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  ShowButton,
  EditButton,
  DeleteButton,
} from "react-admin";
import { CustomList } from "../../../helpers/CustomList";

export const PatternList = () => (
  <CustomList>
    <Datagrid rowClick="show">
      <TextField source="name" label="Наименование" />
      <NumberField source="total_positions" label="Брой позиции" />
      <BooleanField source="is_active" label="Активен" />
      <TextField source="description" label="Описание" />
      <ShowButton />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </CustomList>
);