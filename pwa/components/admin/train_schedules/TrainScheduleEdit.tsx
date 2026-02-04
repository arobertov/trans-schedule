import { Edit, SimpleForm, TextInput, useRecordContext } from 'react-admin';
import { ExcelImportButton } from './ExcelImportButton';

const TrainScheduleTitle = () => {
    const record = useRecordContext();
    return <span>Разписание {record ? `"${record.name}"` : ''}</span>;
};

export const TrainScheduleEdit = () => (
    <Edit title={<TrainScheduleTitle />}>
        <SimpleForm>
             <TextInput source="name" label="Име" fullWidth />
             <TextInput source="description" label="Описание" multiline fullWidth />
             <ExcelImportButton />
        </SimpleForm>
    </Edit>
);
