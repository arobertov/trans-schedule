import { ShowGuesser, FieldGuesser } from "@api-platform/admin";

export const EmployeesShow = () => (
    <ShowGuesser>
        <FieldGuesser source="first_name" />
        <FieldGuesser source="middle_name" />
        <FieldGuesser source="last_name" />
        <FieldGuesser source="phone" />
        <FieldGuesser source="email" />
        <FieldGuesser source="notes" />
        <FieldGuesser source="created_at" />
        <FieldGuesser source="updated_at" />
        <FieldGuesser source="status" />
        <FieldGuesser source="position" />
    </ShowGuesser>
);