import { Create, SimpleForm } from "react-admin";
import { PatternDetailForm } from "./PatternDetailForm";

export const PatternDetailCreate = () => (
  <Create>
    <SimpleForm>
      <PatternDetailForm />
    </SimpleForm>
  </Create>
);