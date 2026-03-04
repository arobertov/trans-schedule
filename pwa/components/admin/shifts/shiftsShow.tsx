import {
    Show,
    SimpleShowLayout,
    Labeled,
    ReferenceField,
    TextField,
    NumberField,
    ArrayField,
    Datagrid,
    FunctionField,
    DateField,
} from "react-admin";
import { Box, Typography } from "@mui/material";

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
        <SimpleShowLayout
            sx={{
                maxWidth: 980,
                "& .RaLabeled-root": {
                    marginBottom: 1,
                },
                "& .RaLabeled-label": {
                    fontWeight: 600,
                    color: "text.secondary",
                    marginBottom: 0.5,
                },
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                    width: "100%",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                }}
            >
                <Labeled label="График на смените">
                    <ReferenceField source="shift_schedule" reference="shift_schedules">
                        <FunctionField
                            render={(record: any) => (
                                <Typography component="span" sx={{ fontWeight: 500 }}>
                                    {record?.name || "-"}
                                    {record?.description ? ` — ${record.description}` : ""}
                                </Typography>
                            )}
                        />
                    </ReferenceField>
                </Labeled>

                <Labeled label="Код на смяна">
                    <TextField source="shift_code" />
                </Labeled>

                <Labeled label="При лекар">
                    <FunctionField
                        source="at_doctor"
                        render={(record: any) => formatTimeValue(record?.at_doctor)}
                    />
                </Labeled>
                <Labeled label="При дежурен">
                    <FunctionField
                        source="at_duty_officer"
                        render={(record: any) => formatTimeValue(record?.at_duty_officer)}
                    />
                </Labeled>
                <Labeled label="Край на смяната">
                    <FunctionField
                        source="shift_end"
                        render={(record: any) => formatTimeValue(record?.shift_end)}
                    />
                </Labeled>
                <Labeled label="Отработено време">
                    <FunctionField
                        source="worked_time"
                        render={(record: any) => formatTimeValue(record?.worked_time)}
                    />
                </Labeled>
                <Labeled label="Нощен труд">
                    <FunctionField
                        source="night_work"
                        render={(record: any) => formatTimeValue(record?.night_work)}
                    />
                </Labeled>
                <Labeled label="Общо време">
                    <FunctionField
                        source="total_time"
                        render={(record: any) => formatTimeValue(record?.total_time)}
                    />
                </Labeled>

                <Labeled label="Километри">
                    <NumberField source="kilometers" />
                </Labeled>
                <Labeled label="Нулево време">
                    <TextField source="zero_time" />
                </Labeled>
            </Box>

            <ArrayField source="routes" label="Маршрути и места">
                <Datagrid
                    bulkActionButtons={false}
                    sx={{
                        "& .RaDatagrid-headerCell": {
                            fontWeight: 700,
                            backgroundColor: "action.hover",
                        },
                        "& .RaDatagrid-row": {
                            "&:nth-of-type(even)": {
                                backgroundColor: "action.selected",
                            },
                        },
                        "& .RaDatagrid-rowCell": {
                            py: 1,
                        },
                    }}
                >
                    <TextField source="route" label="Маршрут" />
                    <NumberField source="route_kilometers" label="Км. за качването" />
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
