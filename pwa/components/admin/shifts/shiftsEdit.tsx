import { EditGuesser, InputGuesser } from "@api-platform/admin";
import { TextInput, TimeInput, NumberInput } from "react-admin";

export const ShiftsEdit = () => (
    <EditGuesser>
        <InputGuesser source="shift_code" />
        <TimeInput source="at_doctor" label="При лекар" />
        <TimeInput source="at_duty_officer" label="При дежурен" />
        <TimeInput source="shift_end" label="Край на смяната" />
        <TimeInput source="worked_time" label="Отработено време" />
        <TimeInput source="night_work" label="Нощен труд" />
        <NumberInput source="kilometers" label="Километри" step={0.01} />
        <TextInput source="zero_time" label="Нулево време (формат: -H:MM или H:MM)" />
    </EditGuesser>
);
