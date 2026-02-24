import {
    Show,
    SimpleShowLayout,
    ReferenceField,
    TextField,
    NumberField,
    ArrayField,
    Datagrid,
    FunctionField,
    DateField,
} from "react-admin";

const formatTimeValue = (value: unknown): string => {
    if (!value) {
        return "-";
    }

    if (value instanceof Date) {
        const hours = String(value.getHours()).padStart(2, "0");
        const minutes = String(value.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (/^\d{2}:\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            const hours = String(parsed.getHours()).padStart(2, "0");
            const minutes = String(parsed.getMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
        }
    }

    return String(value);
};

export const ShiftsShow = () => (
    <Show>
        <SimpleShowLayout>
            <ReferenceField source="shift_schedule" reference="shift_schedules" label="График на смените">
                <TextField source="name" />
            </ReferenceField>

            <TextField source="shift_code" label="Код на смяна" />

            <FunctionField
                source="at_doctor"
                label="При лекар"
                render={(record: any) => formatTimeValue(record?.at_doctor)}
            />
            <FunctionField
                source="at_duty_officer"
                label="При дежурен"
                render={(record: any) => formatTimeValue(record?.at_duty_officer)}
            />
            <FunctionField
                source="shift_end"
                label="Край на смяната"
                render={(record: any) => formatTimeValue(record?.shift_end)}
            />
            <FunctionField
                source="worked_time"
                label="Отработено време"
                render={(record: any) => formatTimeValue(record?.worked_time)}
            />
            <FunctionField
                source="night_work"
                label="Нощен труд"
                render={(record: any) => formatTimeValue(record?.night_work)}
            />
            <FunctionField
                source="total_time"
                label="Общо време"
                render={(record: any) => formatTimeValue(record?.total_time)}
            />

            <NumberField source="kilometers" label="Километри" />
            <TextField source="zero_time" label="Нулево време" />

            <ArrayField source="routes" label="Маршрути и места">
                <Datagrid bulkActionButtons={false}>
                    <TextField source="route" label="Маршрут" />
                    <TextField source="pickup_location" label="Място на качване" />
                    <TextField source="pickup_route_number" label="Път № (качване)" />
                    <FunctionField
                        source="in_schedule"
                        label="В график"
                        render={(record: any) => formatTimeValue(record?.in_schedule)}
                    />
                    <FunctionField
                        source="from_schedule"
                        label="От график"
                        render={(record: any) => formatTimeValue(record?.from_schedule)}
                    />
                    <TextField source="dropoff_location" label="Място на слизане" />
                    <TextField source="dropoff_route_number" label="Път № (слизане)" />
                </Datagrid>
            </ArrayField>

            <DateField source="created_at" label="Създаден на" showTime />
            <DateField source="updated_at" label="Обновен на" showTime />
        </SimpleShowLayout>
    </Show>
);
