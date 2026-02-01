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
            redirect('show', 'calendars', record.id);
        },
        onError: async (error: any) => {
            let errorMessage = '';

            // 1. Проверяваме дали грешката е обработена от Data Provider-а (често в error.body)
            // 2. Ако не е, но имаме response обект, трябва да прочетем JSON-а
            if (error.body && error.body.description) {
                errorMessage = error.body.description;
            } else if (error.response && typeof error.response.json === 'function') {
                try {
                    const clonedResponse = error.response.clone(); // Клонираме, за да не "консумираме" стрийма два пъти
                    const errorData = await clonedResponse.json();
                    errorMessage = errorData.description || errorData.detail || 'Unknown error';
                } catch (e) {
                    errorMessage = 'Грешка при четене на отговора от сървъра';
                }
            } else {
                errorMessage = error.message || 'Възникна неочаквана грешка';
            }

            console.log('Processed Error Message:', errorMessage);

            // Сега проверката ще работи, защото errorMessage е чист текст
            const isConnectionIssue = 
                errorMessage.includes('Неуспешна връзка') || 
                errorMessage.includes('Could not fetch') || 
                error.status === 500;

            if (isConnectionIssue) {
                setPendingData(data);
                setShowBackupDialog(true);
            } else {
                notify(`Грешка: ${errorMessage}`, { type: 'error' });
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
                            { id: 'scrape', name: 'Kik-Info (Извличане на данни от интернет)' },
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
                        helperText="За извичане на данни от интернет: основен URL. За API: endpoint URL."
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
