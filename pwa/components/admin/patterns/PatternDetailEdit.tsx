import { Edit, SimpleForm } from "react-admin";
import { PatternDetailForm } from "./PatternDetailForm";

export const PatternDetailEdit = () => (
  <Edit>
    <SimpleForm>
      <PatternDetailForm isEdit />
    </SimpleForm>
  </Edit>
);