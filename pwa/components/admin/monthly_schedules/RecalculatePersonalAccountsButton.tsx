import React from 'react';
import { Button } from '@mui/material';
import { useRecordContext, useNotify, useRefresh } from 'react-admin';
import { getToken } from '../../../jwt-frontend-auth/src/auth/authService';

export const RecalculatePersonalAccountsButton = () => {
    const record = useRecordContext<any>();
    const notify = useNotify();
    const refresh = useRefresh();

    const resolveScheduleId = (value: unknown): string => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';

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
