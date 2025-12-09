import { ListGuesser, FieldGuesser } from "@api-platform/admin";
import { FunctionField, TopToolbar, CreateButton, Button } from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ListActions = () => (
    <TopToolbar>
        <CreateButton />
        <Button
            component={Link}
            to="/employees/bulk-import"
            label="Масов импорт"
            startIcon={<UploadFileIcon />}
        />
    </TopToolbar>
);

export const EmployeesList = () => (
    <ListGuesser actions={<ListActions />}>
        <FieldGuesser source="first_name" label="Име" />
        <FieldGuesser source="middle_name" label="Презиме" />
        <FieldGuesser source="last_name" label="Фамилия" />
        <FieldGuesser source="phone" label="Телефон" />
        <FieldGuesser source="email" label="Имейл" />
        <FieldGuesser source="created_at" label="Добавен на" />
        <FieldGuesser source="updated_at" label="Обновен на" />
        <FieldGuesser source="status" label="Статус" />
        <FunctionField 
            label="Позиция" 
            render={(record: any) => record.position?.name || '-'} 
        />
    </ListGuesser>
);