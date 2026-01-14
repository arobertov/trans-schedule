import { Create, SimpleForm, ReferenceInput, SelectInput, NumberInput, TextInput, required, useNotify, useRedirect, useDataProvider } from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";
import { useEffect } from "react";

const AutoFillCalendarData = () => {
    const { setValue } = useFormContext();
    const year = useWatch({ name: 'year' });
    const month = useWatch({ name: 'month' });
    const dataProvider = useDataProvider();

    useEffect(() => {
        if (!year || !month) return;

        dataProvider.getList('calendars', {
            filter: { year: year },
            pagination: { page: 1, perPage: 1 },
            sort: { field: 'year', order: 'DESC' }
        })
        .then(({ data }) => {
            if (data && data.length > 0 && data[0].monthsData) {
                const monthInfo = data[0].monthsData[month];
                if (monthInfo) {
                    setValue('working_days', monthInfo.workDays || 0);
                    setValue('working_hours', monthInfo.workHours || 0);
                }
            } else {
                 // Reset if no data found? Or keep manual entry.
            }
        })
        .catch(err => console.error("Failed to fetch calendar for autofill", err));

    }, [year, month, dataProvider, setValue]);

    return null;
};

export const MonthlyScheduleCreate = () => {
    const notify = useNotify();
    const redirect = useRedirect();
    const date = new Date();

    return (
        <Create redirect="edit">
            <SimpleForm>
                <AutoFillCalendarData />
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
