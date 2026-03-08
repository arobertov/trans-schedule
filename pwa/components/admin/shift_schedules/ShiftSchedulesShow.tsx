import {
    Show,
    SimpleShowLayout,
    DateField,
    Labeled,
    useShowContext,
} from "react-admin";
import {
    Box,
    Paper,
} from "@mui/material";
import { ShiftScheduleUniverTable } from "./ShiftScheduleUniverTable";

const ShiftJournalTable = () => {
    const { record } = useShowContext();

    return <ShiftScheduleUniverTable record={record} />;
};

export const ShiftSchedulesShow = () => (
    <Show>
        <SimpleShowLayout>
            <Box
                width="100%"
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                    mb: 1,
                }}
            >
                <Box component={Paper} variant="outlined" sx={{ p: 2 }}>
                    <Labeled label="Създаден на" fullWidth>
                        <DateField source="created_at" showTime />
                    </Labeled>
                </Box>

                <Box component={Paper} variant="outlined" sx={{ p: 2 }}>
                    <Labeled label="Обновен на" fullWidth>
                        <DateField source="updated_at" showTime />
                    </Labeled>
                </Box>
            </Box>

            <Box width="100%">
                <ShiftJournalTable />
            </Box>
        </SimpleShowLayout>
    </Show>
);
