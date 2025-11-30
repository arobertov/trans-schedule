import { CreateGuesser, InputGuesser } from "@api-platform/admin";
import { ReferenceInput, SelectInput } from "react-admin";

export const EmployeesCreate = () => (
    <CreateGuesser>
        <InputGuesser source="first_name" />
        <InputGuesser source="middle_name" />
        <InputGuesser source="last_name" />
        <InputGuesser source="phone" />
        <InputGuesser source="email" />
        <InputGuesser source="notes" />
        <SelectInput source="status" choices={[
            { id: 'активен', name: 'Активен' },
            { id: 'неактивен', name: 'Неактивен' },
            { id: 'напуснал', name: 'Напуснал' }
        ]} />
        <ReferenceInput source="position" reference="positions">
            <SelectInput optionText="name" />
        </ReferenceInput>
    </CreateGuesser>
);