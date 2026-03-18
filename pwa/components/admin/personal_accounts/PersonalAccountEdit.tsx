import { Edit, SimpleForm } from 'react-admin';
import { useParams } from 'react-router-dom';
import { PersonalAccountUniverGrid } from './PersonalAccountUniverGrid';

export const PersonalAccountEdit = () => {
    const { id } = useParams<{ id?: string }>();
    const decodedId = id ? decodeURIComponent(id) : undefined;
    const editId = decodedId
        ? (decodedId.startsWith('/personal_accounts/') ? decodedId : `/personal_accounts/${decodedId}`)
        : undefined;

    return (
        <Edit
            resource="personal_accounts"
            id={editId}
            title="Лична сметка"
            mutationMode="pessimistic"
            redirect={false}
            redirectOnError={false}
        >
            <SimpleForm toolbar={false}>
                <PersonalAccountUniverGrid />
            </SimpleForm>
        </Edit>
    );
};
