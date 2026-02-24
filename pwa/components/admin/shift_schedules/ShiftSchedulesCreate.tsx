import { CreateGuesser, InputGuesser } from "@api-platform/admin";

export const ShiftSchedulesCreate = () => (
    <CreateGuesser>
        <InputGuesser source="name" label="Име на графика" />
    </CreateGuesser>
);
