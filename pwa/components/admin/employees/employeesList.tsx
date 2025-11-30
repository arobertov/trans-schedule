import { ListGuesser, FieldGuesser } from "@api-platform/admin";
import { FunctionField } from "react-admin";


export const EmployeesList = () => (
    <ListGuesser>
        <FieldGuesser source="first_name" label="Име" />
        <FieldGuesser source="middle_name" label="Презиме" />
        <FieldGuesser source="last_name" label="Фамилия" />
        <FieldGuesser source="phone" label="Телефон" />
        <FieldGuesser source="email" label="Имейл" />
        <FieldGuesser source="created_at" label="Добавен на" />
        <FieldGuesser source="updated_at" label="Обновен на" />
        <FieldGuesser source="status" label="Статус" />
        <FunctionField label="Позиция" render={(record: any) => record.position?.name || '-'} />
    </ListGuesser>
);