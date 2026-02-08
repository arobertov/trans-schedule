import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, LinearProgress, Typography, Box } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useRecordContext, useNotify, useRefresh } from 'react-admin';
import { parseTrainScheduleExcel } from '../../../helpers/excelParser';
import { getToken } from '../../../jwt-frontend-auth/src/auth/authService';

export const ExcelImportButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    const CHUNK_SIZE = 500; // Adjust chunk size as needed

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        // Confirm replacement
        if (!window.confirm('ВНИМАНИЕ: Това действие ще изтрие ВСИЧКИ съществуващи редове в това разписание и ще ги замени с новите от файла. Сигурни ли сте?')) {
             e.target.value = '';
             return;
        }

        const file = e.target.files[0];
        setImporting(true);
        setProgress(0);
        setStatusMessage('Reading file...');

        try {
            const allData = await parseTrainScheduleExcel(file);
            
            if (allData.length === 0) {
                 notify('Не бяха намерени валидни данни във файла.', { type: 'warning' });
                 setImporting(false);
                 return;
            }

            const totalRows = allData.length;
            setStatusMessage(`Starting import of ${totalRows} rows...`);

            // Robust URL construction
            const origin = window.location.origin;
            let scheduleId = record?.id;
            
            if (!scheduleId) {
                throw new Error('Липсва ID на разписанието (record.id is missing)');
            }

            // Handle API Platform IRIs (e.g. if id is "/train_schedules/1")
            if (typeof scheduleId === 'string' && scheduleId.includes('/')) {
                const parts = scheduleId.split('/');
                scheduleId = parts[parts.length - 1]; // Get the last part (the actual ID)
            }

            const apiPath = `/train_schedules/${scheduleId}/import`;

            // Prepare headers
            const token = getToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Chunk processing
            let processed = 0;
            const chunks = [];
            for (let i = 0; i < allData.length; i += CHUNK_SIZE) {
                chunks.push(allData.slice(i, i + CHUNK_SIZE));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                
                // First chunk clears the DB (append=false), subsequent chunks append (append=true)
                const appendMode = !isFirstChunk;
                const urlObj = new URL(apiPath, origin);
                // "append" parameter: '1' (true) or '0' (false)
                urlObj.searchParams.append('append', appendMode ? '1' : '0');
                
                setStatusMessage(`Importing batch ${i + 1} of ${chunks.length} (${chunk.length} rows)...`);

                const response = await fetch(urlObj.toString(), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(chunk),
                });

                if (!response.ok) {
                    let errorMessage = response.statusText;
                    try {
                        const errorJson = await response.json();
                        if (errorJson['hydra:description']) errorMessage = errorJson['hydra:description'];
                        else if (errorJson.message) errorMessage = errorJson.message;
                        else if (errorJson.detail) errorMessage = errorJson.detail;
                    } catch (e) { /* ignore */ }
                    throw new Error(`Server returned ${response.status}: ${errorMessage}`);
                }

                processed += chunk.length;
                setProgress(Math.round((processed / totalRows) * 100));
            }

            setStatusMessage('Completed!');
            notify(`Успешен импорт на ${totalRows} реда!`, { type: 'success' });
            refresh();
        } catch (error) {
            console.error('Import Error:', error);
            notify('Грешка при импорт: ' + String(error), { type: 'error' });
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <>
            <Button
                component="label"
                variant="contained"
                startIcon={<UploadFileIcon />}
                disabled={importing}
            >
                Импорт на график от Excel
                <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                />
            </Button>

            <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" component="div">
                    Очаквани колони в Excel файла:
                    <ul style={{ margin: '6px 0 0 18px' }}>
                        <li>Влак</li>
                        <li>Коловоз на станция</li>
                        <li>Час на пристигане</li>
                        <li>Час на отпътуване</li>
                    </ul>
                </Typography>
            </Box>

            <Dialog open={importing} disableEscapeKeyDown>
                <DialogTitle>Импортиране на разписание</DialogTitle>
                <DialogContent sx={{ width: '400px' }}>
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {statusMessage}
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
                            {progress}%
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};
