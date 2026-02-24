import { CreateGuesser, InputGuesser } from "@api-platform/admin";
import { TextInput, TimeInput, NumberInput, ReferenceInput, SelectInput, ArrayInput, SimpleFormIterator } from "react-admin";

export const ShiftsCreate = () => (
    <CreateGuesser>
        <ReferenceInput source="shift_schedule" reference="shift_schedules">
            <SelectInput
                optionText="name"
                label="График на смените"
                format={(value: any) => {
                    if (!value) {
                        return value;
                    }

                    if (typeof value === 'string') {
                        return value;
                    }

                    if (typeof value === 'number') {
                        return `/shift_schedules/${value}`;
                    }

                    return value['@id'] ?? value.id ?? value;
                }}
                parse={(value: any) => value}
            />
        </ReferenceInput>
        <InputGuesser source="shift_code" label="Код на смяна" />
        <TimeInput source="at_doctor" label="При лекар" />
        <TimeInput source="at_duty_officer" label="При дежурен" />
        <TimeInput source="shift_end" label="Край на смяната" />
        <TimeInput source="worked_time" label="Отработено време" />
        <TimeInput source="night_work" label="Нощен труд" />
        <NumberInput source="kilometers" label="Километри" step={0.01} />
        <TextInput source="zero_time" label="Нулево време (формат: -H:MM или H:MM)" />

        <ArrayInput source="routes" label="Маршрути и места">
            <SimpleFormIterator inline>
                <NumberInput source="route" label="Маршрут" />
                <TextInput source="pickup_location" label="Място на качване" />
                <NumberInput source="pickup_route_number" label="Път № (качване)" />
                <TimeInput source="in_schedule" label="В график" />
                <TimeInput source="from_schedule" label="От график" />
                <TextInput source="dropoff_location" label="Място на слизане" />
                <NumberInput source="dropoff_route_number" label="Път № (слизане)" />
            </SimpleFormIterator>
        </ArrayInput>
    </CreateGuesser>
);
