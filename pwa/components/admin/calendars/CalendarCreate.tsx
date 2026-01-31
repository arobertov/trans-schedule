import { useState } from 'react';
import { Create, SimpleForm, NumberInput, TextInput, SelectInput, BooleanInput, required, Toolbar, SaveButton, useCreate, useNotify, useRedirect } from 'react-admin';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

const CalendarCreateToolbar = () => (
    <Toolbar>
        <SaveButton 
            alwaysEnable
            label="Създай Календар" 
        />
    </Toolbar>
);

export const CalendarCreate = () => {
    const [create] = useCreate();
    const notify = useNotify();
    const redirect = useRedirect();
    const [showBackupDialog, setShowBackupDialog] = useState(false);
    const [pendingData, setPendingData] = useState<any>(null);

    const handleSubmit = (data: any) => {
        create('calendars', { data }, {
            onSuccess: (record) => {
                notify('Календарът е създаден успешно');
                // record might be the response wrapper or the data itself depending on RA version/Data Provider
                // Usually record.id works.
                redirect('show', 'calendars', record.id);
            },
            onError: (error: any) => {
                const msg = error?.message || error?.body?.['hydra:description'] || 'Unknown error';
                console.error('Create error:', error);

                if (msg.includes('Неуспешна връзка') || msg.includes('Failed to scrape') || msg.includes('connection') || msg.includes('500')) {
                    setPendingData(data);
                    setShowBackupDialog(true);
                } else {
                    notify(`Грешка: ${msg}`, { type: 'error' });
                }
            }
        });
    };

    const handleConfirmBackup = () => {
        if (!pendingData) return;
        const newData = { ...pendingData, useBackup: true };
        create('calendars', { data: newData }, {
            onSuccess: (record) => {
                notify('Календарът е създаден с резервна логика', { type: 'warning' });
                redirect('show', 'calendars', record.id);
                setShowBackupDialog(false);
            },
            onError: (error: any) => {
                notify(`Грешка: ${error.message || 'Error'}`, { type: 'error' });
                setShowBackupDialog(false);
            }
        });
    };

    return (
        <>
            <Create redirect="show" title="Създаване на Календар">
                <SimpleForm toolbar={<CalendarCreateToolbar />} onSubmit={handleSubmit}>
                    <NumberInput 
                        source="year" 
                        label="Година" 
                        defaultValue={new Date().getFullYear()} 
                        validate={[required()]}
                    />
                    
                    <SelectInput
                        source="provider"
                        label="Източник на данни"
                        defaultValue="scrape"
                        choices={[
                            { id: 'scrape', name: 'Kik-Info (Web Scraping)' },
                            { id: 'api', name: 'Външно API' },
                            { id: 'fallback', name: 'Алгоритмично (Без Интернет)' },
                        ]}
                        validate={[required()]}
                    />

                    <TextInput 
                        source="sourceUrl" 
                        label="Web адрес / API URL" 
                        fullWidth
                        defaultValue="https://kik-info.com/spravochnik/calendar"
                        helperText="За scraping: основен URL. За API: endpoint URL."
                    />

                    <BooleanInput 
                        source="useBackup" 
                        label="Използвай резервна логика при грешка автоматично" 
                        defaultValue={false}
                    />
                </SimpleForm>
            </Create>

            <Dialog
                open={showBackupDialog}
                onClose={() => setShowBackupDialog(false)}
            >
                <DialogTitle>Неуспешна връзка с източника</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Не успяхме да извлечем данни и автоматичният резерв не беше включен. 
                        Желаете ли да опитаме отново използвайки резервната алгоритмична логика?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowBackupDialog(false)}>Отказ</Button>
                    <Button onClick={handleConfirmBackup} color="primary" autoFocus>
                        Да, използвай резервна логика
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
