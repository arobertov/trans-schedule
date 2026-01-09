import { Create, SimpleForm, ReferenceInput, SelectInput, NumberInput, TextInput, required, useNotify, useRedirect } from "react-admin";

export const MonthlyScheduleCreate = () => {
    const notify = useNotify();
    const redirect = useRedirect();
    const date = new Date();

    return (
        <Create redirect="edit">
            <SimpleForm>
                <ReferenceInput source="position" reference="positions">
                    <SelectInput optionText="name" label="Длъжност" validate={required()} />
                </ReferenceInput>
                <NumberInput source="year" label="Година" defaultValue={date.getFullYear()} validate={required()} />
                <NumberInput source="month" label="Месец" defaultValue={date.getMonth() + 1} validate={required()} />
                <NumberInput source="working_days" label="Работните дни" />
                <NumberInput source="working_hours" label="Работните часове" />
                <TextInput source="description" label="Описание" fullWidth multiline />
            </SimpleForm>
        </Create>
    );
};
