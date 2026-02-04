import React, { useState } from 'react';
import { Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useRecordContext, useNotify, useRefresh } from 'react-admin';
import { parseTrainScheduleExcel } from '../../../helpers/excelParser';
import { ENTRYPOINT } from '../../../config/entrypoint';
import { fetchHydra } from '@api-platform/admin';
import { getToken } from '../../../jwt-frontend-auth/src/auth/authService';

export const ExcelImportButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        // Confirm replacement
        if (!window.confirm('ВНИМАНИЕ: Това действие ще изтрие ВСИЧКИ съществуващи редове в това разписание и ще ги замени с новите от файла. Сигурни ли сте?')) {
             e.target.value = '';
             return;
        }

        const file = e.target.files[0];
        setLoading(true);

        try {
            const data = await parseTrainScheduleExcel(file);
            
            if (data.length === 0) {
                 notify('Не бяха намерени валидни данни във файла.', { type: 'warning' });
                 setLoading(false);
                 return;
            }

            // Robust URL construction
            const origin = window.location.origin;
            // Handle potentially missing ID
            const scheduleId = record?.id;
            
            if (!scheduleId) {
                throw new Error('Липсва ID на разписанието (record.id is missing)');
            }

            // Construct URL without relying on ENTRYPOINT constant which might be flaky
            const urlStr = `${origin}train_schedules/${scheduleId}/import`;
            console.log('Starting import to:', urlStr);

            // Add Authentication Token
            const token = getToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            await fetchHydra(urlStr, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            });

            notify(`Успешен импорт на ${data.length} реда!`, { type: 'success' });
            refresh();
        } catch (error) {
            console.error('Import Error:', error);
            notify('Грешка при импорт: ' + String(error), { type: 'error' });
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    if (!record || !record.id) return null;

    return (
        <div style={{ margin: '20px 0', border: '1px dashed #ccc', padding: '15px', borderRadius: '4px' }}>
            <h3>Масов Импорт</h3>
            <Button
                variant="contained"
                component="label"
                color="primary"
                startIcon={<UploadFileIcon />}
                disabled={loading}
            >
                {loading ? 'Обработка...' : 'Качи Excel файл (Заместване)'}
                <input
                    type="file"
                    hidden
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                />
            </Button>
            <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                Файлът трябва да съдържа колони: <b>Влак</b>, <b>Коловоз на станция</b>, <b>Час на пристигане</b>, <b>Час на отпътуване</b>.
            </div>
        </div>
    );
};
