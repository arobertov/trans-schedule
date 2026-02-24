import {
    Show,
    SimpleShowLayout,
    TextField,
    DateField,
    useShowContext,
    useGetList,
} from "react-admin";
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Paper,
} from "@mui/material";

const formatTimeValue = (value: unknown): string => {
    if (!value) {
        return "-";
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

        return trimmed;
    }

    return String(value);
};

const formatKilometers = (value: unknown): string => {
    if (typeof value !== "number") {
        return "-";
    }

    return value.toLocaleString("bg-BG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const ShiftJournalTable = () => {
    const { record } = useShowContext();
    const scheduleIri = record?.["@id"] ?? (record?.id ? `/shift_schedules/${record.id}` : null);

    const { data = [], isLoading } = useGetList("shift_schedule_details", {
        pagination: { page: 1, perPage: 200 },
        sort: { field: "id", order: "ASC" },
        filter: scheduleIri ? { shift_schedule: scheduleIri } : {},
    });

    if (isLoading) {
        return <Typography>Зареждане на смените...</Typography>;
    }

    if (data.length === 0) {
        return <Typography>Няма добавени смени в този график.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">№</TableCell>
                        <TableCell align="center" >Смяна</TableCell>
                        <TableCell align="center">При лекар</TableCell>
                        <TableCell align="center">При деж.</TableCell>
                        <TableCell align="center">Маршрут</TableCell>
                        <TableCell align="center">Място (качване)</TableCell>
                        <TableCell align="center">Път №</TableCell>
                        <TableCell align="center">В график</TableCell>
                        <TableCell align="center">От график</TableCell>
                        <TableCell align="center">Място (слизане)</TableCell>
                        <TableCell align="center">Път №</TableCell>
                        <TableCell align="center">Край</TableCell>
                        <TableCell align="center">Раб. вр.</TableCell>
                        <TableCell align="center">Км.</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((shift: any, shiftIndex: number) => {
                        const routes = Array.isArray(shift?.routes) && shift.routes.length > 0
                            ? shift.routes
                            : [{}];

                        return routes.map((route: any, routeIndex: number) => (
                            <TableRow key={`${shift?.id ?? shiftIndex}-${routeIndex}`}>
                                {routeIndex === 0 && (
                                    <>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{shiftIndex + 1}</TableCell>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{shift?.shift_code ?? "-"}</TableCell>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{formatTimeValue(shift?.at_doctor)}</TableCell>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{formatTimeValue(shift?.at_duty_officer)}</TableCell>
                                    </>
                                )}

                                <TableCell align="center">{route?.route ?? "-"}</TableCell>
                                <TableCell align="center">{route?.pickup_location ?? "-"}</TableCell>
                                <TableCell align="center">{route?.pickup_route_number ?? "*"}</TableCell>
                                <TableCell align="center">{formatTimeValue(route?.in_schedule)}</TableCell>
                                <TableCell align="center">{formatTimeValue(route?.from_schedule)}</TableCell>
                                <TableCell align="center">{route?.dropoff_location ?? "-"}</TableCell>
                                <TableCell align="center">{route?.dropoff_route_number ?? "*"}</TableCell>

                                {routeIndex === 0 && (
                                    <>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{formatTimeValue(shift?.shift_end)}</TableCell>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{formatTimeValue(shift?.worked_time)}</TableCell>
                                        <TableCell rowSpan={routes.length} align="center" sx={{ verticalAlign: "top" }}>{formatKilometers(shift?.kilometers)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ));
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export const ShiftSchedulesShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="name" label="Име на графика" />
            <DateField source="created_at" label="Създаден на" showTime />
            <DateField source="updated_at" label="Обновен на" showTime />

            <Box width="100%">
                <Typography variant="h5" textAlign="center" sx={{ fontWeight: 700, mb: 1 }}>
                    ДЕЛНИК
                </Typography>
                <ShiftJournalTable />
            </Box>
        </SimpleShowLayout>
    </Show>
);
