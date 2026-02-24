import { EditGuesser, InputGuesser } from "@api-platform/admin";

export const ShiftSchedulesEdit = () => (
    <EditGuesser>
        <InputGuesser source="name" label="Име на графика" />
    </EditGuesser>
);
