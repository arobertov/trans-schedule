import { ShowGuesser, FieldGuesser } from "@api-platform/admin";

export const ShiftsShow = () => (
    <ShowGuesser>
        <FieldGuesser source="shift_code" />
        <FieldGuesser source="day_type" />
        <FieldGuesser source="season" />
        <FieldGuesser source="worked_time" />
        <FieldGuesser source="night_work" />
        <FieldGuesser source="total_time" />
        <FieldGuesser source="kilometers" />
        <FieldGuesser source="zero_time" />
        <FieldGuesser source="created_at" />
        <FieldGuesser source="updated_at" />
    </ShowGuesser>
);
