import { Edit, SimpleForm, TextInput, NumberInput, SelectInput, ReferenceInput, useNotify, useRecordContext, useRefresh } from "react-admin";
import { MonthlyScheduleGrid } from "./MonthlyScheduleGrid";
import { Box, Button } from "@mui/material";
import { getToken } from "../../../jwt-frontend-auth/src/auth/authService";

const ScheduleTitle = () => {
    const record = useRecordContext();
    return <span>График {record ? `"${record.year}-${record.month}"` : ''}</span>;
}

const RecalculatePersonalAccountsButton = () => {
    const record = useRecordContext<any>();
    const notify = useNotify();
    const refresh = useRefresh();

    const resolveScheduleId = (value: unknown): string => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';

        // React-admin can hydrate id as IRI (e.g. /monthly_schedules/1).
        const iriMatch = raw.match(/\/monthly_schedules\/([^/]+)$/);
        if (iriMatch?.[1]) {
            return iriMatch[1];
        }

        return raw.replace(/^\/+|\/+$/g, '');
    };

    const recalculate = async () => {
        const scheduleId = resolveScheduleId(record?.id);
        if (!scheduleId) return;

        try {
            const token = getToken();
            const response = await fetch(`${window.origin}/monthly_schedules/${encodeURIComponent(scheduleId)}/personal_accounts/recalculate`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Неуспешна рекалкулация на личните сметки.');
            }

            const payload = await response.json();
            notify(`Преизчислени лични сметки: ${payload?.processed_accounts ?? 0}`, { type: 'success' });
            refresh();
        } catch (error: any) {
            notify(error?.message || 'Грешка при преизчисляване на личните сметки.', { type: 'error' });
        }
    };

    return (
        <Button variant="outlined" onClick={recalculate}>
            Преизчисли лични сметки
        </Button>
    );
};

export const MonthlyScheduleEdit = () => (
    <Edit title={<ScheduleTitle />}>
        <SimpleForm>
            <Box display="flex" gap={2}>
                 <ReferenceInput source="position" reference="positions" >
                    <SelectInput optionText="name" label="Длъжност" disabled />
                </ReferenceInput>
                <NumberInput source="year" label="Година" disabled />
                <NumberInput source="month" label="Месец" disabled />
                <SelectInput source="status" choices={[
                    { id: 'чернова', name: 'Чернова' },
                    { id: 'утвърден', name: 'Утвърден' },
                    { id: 'архивиран', name: 'Архивиран' },
                ]} label="Статус" />
            </Box>
             <Box display="flex" gap={2}>
                <NumberInput source="working_days" label="Работни дни" />
                <NumberInput source="working_hours" label="Работни часове" />
                <TextInput source="description" label="Описание" fullWidth multiline />
            </Box>

            <RecalculatePersonalAccountsButton />
            
            <MonthlyScheduleGrid />
        </SimpleForm>
    </Edit>
);
