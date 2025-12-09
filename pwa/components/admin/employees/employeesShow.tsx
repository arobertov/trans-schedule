import { ShowGuesser, FieldGuesser } from "@api-platform/admin";
import { FunctionField, ChipField, TextField, DateField } from "react-admin";
import { Stack, Box, Grid, Paper, Typography, Divider } from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import EmailIcon from '@mui/icons-material/Email';
import NotesIcon from '@mui/icons-material/Notes';

export const EmployeesShow = () => (
    <ShowGuesser>
        <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
                {/* Основна информация */}
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <PersonIcon color="primary" />
                            <Typography variant="h6" color="primary">Лична информация</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" spacing={3} alignItems="center">
                            <FieldGuesser source="first_name" label="Име" />
                            <FieldGuesser source="middle_name" label="Презиме" />
                            <FieldGuesser source="last_name" label="Фамилия" />
                        </Stack>
                    </Paper>
                </Grid>

                {/* Позиция и статус */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <WorkIcon color="primary" />
                            <Typography variant="h6" color="primary">Позиция и статус</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            <FunctionField
                                label="Позиция"
                                render={(record: any) => (
                                    <ChipField 
                                        record={{ value: record.position?.name || 'Не е зададена' }} 
                                        source="value" 
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                            />
                            <FieldGuesser source="status" label="Статус" />
                        </Stack>
                    </Paper>
                </Grid>

                {/* Контакти */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <ContactPhoneIcon color="primary" />
                            <Typography variant="h6" color="primary">Контактна информация</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ContactPhoneIcon fontSize="small" color="action" />
                                <ChipField source="phone" label="Телефон" color="success" />
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <EmailIcon fontSize="small" color="action" />
                                <ChipField source="email" label="Имейл" color="info" />
                            </Stack>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Бележки */}
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <NotesIcon color="primary" />
                            <Typography variant="h6" color="primary">Бележки</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <TextField source="notes" label="" />
                    </Paper>
                </Grid>

                {/* Метаданни */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">
                            Добавен на:
                        </Typography>
                        <DateField source="created_at" showTime />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">
                            Последна промяна:
                        </Typography>
                        <DateField source="updated_at" showTime />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    </ShowGuesser>
);