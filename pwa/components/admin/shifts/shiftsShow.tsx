import { ShowGuesser, FieldGuesser } from "@api-platform/admin";

export const ShiftsShow = () => (
    <ShowGuesser>
        <FieldGuesser source="shift_code" />
        <FieldGuesser source="at_doctor" />
        <FieldGuesser source="at_duty_officer" />
        <FieldGuesser source="shift_end" />
        <FieldGuesser source="worked_time" />
        <FieldGuesser source="night_work" />
        <FieldGuesser source="total_time" />
        <FieldGuesser source="kilometers" />
        <FieldGuesser source="zero_time" />
        <FieldGuesser source="created_at" />
        <FieldGuesser source="updated_at" />
    </ShowGuesser>
);
