import { EditGuesser, InputGuesser } from "@api-platform/admin";
import { SelectInput, TimeInput, NumberInput } from "react-admin";

export const ShiftsEdit = () => (
    <EditGuesser>
        <InputGuesser source="shift_code" />
        <SelectInput source="day_type" choices={[
            { id: 'Делник', name: 'Делник' },
            { id: 'Празник', name: 'Празник' }
        ]} />
        <SelectInput source="season" choices={[
            { id: 'Зимен', name: 'Зимен' },
            { id: 'Летен', name: 'Летен' }
        ]} />
        <TimeInput source="worked_time" label="Отработено време" />
        <TimeInput source="night_work" label="Нощен труд" />
        <NumberInput source="kilometers" label="Километри" step={0.01} />
        <TimeInput source="zero_time" label="Нулево време" />
    </EditGuesser>
);
