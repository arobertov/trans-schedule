import { CreateGuesser, InputGuesser } from "@api-platform/admin";

export const ShiftSchedulesCreate = () => (
    <CreateGuesser>
        <InputGuesser source="name" label="Име на графика за смените" />
        <InputGuesser source="description" label="Описание на графика за смените" />
    </CreateGuesser>
);
