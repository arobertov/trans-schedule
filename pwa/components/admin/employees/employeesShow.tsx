import { Show, SimpleShowLayout, FunctionField, ChipField, TextField, DateField, ReferenceField, TopToolbar, ListButton, EditButton } from "react-admin";
import { Stack, Box, Grid, Paper, Typography, Divider } from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import EmailIcon from '@mui/icons-material/Email';
import NotesIcon from '@mui/icons-material/Notes';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const EmployeesShowActions = () => (
    <TopToolbar>
        <ListButton label="Назад към списъка" />
        <EditButton label="Редактирай" />
    </TopToolbar>
);

export const EmployeesShow = () => (
    <Show actions={<EmployeesShowActions />}>
        <SimpleShowLayout>
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
                            <FunctionField
                                label="Име"
                                render={(record: any) => (
                                    <Link
                                        to={`/employees/${encodeURIComponent(record.id)}`}
                                        style={{ textDecoration: 'none', color: 'inherit' }} // Премахваме стандартното подчертаване на линка
                                    >
                                        <Typography
                                            variant="h5"
                                            fontWeight="bold"
                                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                        >
                                            {record.first_name}
                                        </Typography>
                                    </Link>

                                )}
                            />
                            <FunctionField
                                label="Презиме"
                                render={(record: any) => (
                                    <Link
                                        to={`/employees/${encodeURIComponent(record.id)}`}
                                        style={{ textDecoration: 'none', color: 'inherit' }} // Премахваме стандартното подчертаване на линка
                                    >
                                        <Typography
                                            variant="h5"
                                            fontWeight="bold"
                                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                        >
                                            {record.middle_name}
                                        </Typography>

                                    </Link>
                                )}
                            />
                            <FunctionField
                                label="Фамилия"
                                render={(record: any) => (
                                    <Link
                                        to={`/employees/${encodeURIComponent(record.id)}`}
                                        style={{ textDecoration: 'none', color: 'inherit' }} // Премахваме стандартното подчертаване на линка
                                    >
                                        <Typography
                                            variant="h5"
                                            fontWeight="bold"
                                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                        >
                                            {record.last_name}
                                        </Typography>
                                    </Link>
                                )}
                            />
                        </Stack>
                    </Paper>
                </Grid>

                {/* Длъжност и статус */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <WorkIcon color="primary" />
                            <Typography variant="h6" color="primary">Длъжност и статус</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            <ReferenceField source="position" reference="positions" />
                            <FunctionField
                                label="Статус"
                                render={(record: any) => {
                                    const status = String(record?.status ?? "");
                                    const statusLabel = status
                                        ? `${status.charAt(0).toUpperCase()}${status.slice(1)}`
                                        : "";

                                    return (
                                        <ChipField
                                            record={{ value: statusLabel }}
                                            source="value"
                                            color={status.toLowerCase() === "активен" ? "success" : "error"}
                                        />
                                    );
                                }}
                            />
                        </Stack>
                    </Paper>
                </Grid>

                {/* Контакти */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <ContactPhoneIcon color="primary" />
                            <Typography variant="h6" color="primary">Информация за контакт</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ContactPhoneIcon fontSize="small" color="action" />
                                <FunctionField
                                    label="Телефон"
                                    render={(record: any) => {
                                        const rawPhone = record?.phone ?? '';
                                        const normalized = String(rawPhone).replace(/\s+/g, '');

                                        const localPhone = normalized.startsWith('')
                                            ? `0${normalized.slice(4)}`
                                            : normalized;

                                        const match = localPhone.match(/^0(8\d{2})(\d{3})(\d{3})$/);

                                        const formattedPhone = match
                                            ? `0${match[1]} ${match[2]} ${match[3]}`
                                            : rawPhone;

                                        return (
                                            <ChipField
                                                record={{ value: formattedPhone }}
                                                source="value"
                                                color="success"
                                            />
                                        );
                                    }}
                                />
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
                    <Paper elevation={1} sx={{ p: 2}}>
                        <Typography variant="caption" color="text.secondary">
                            Добавен на:
                        </Typography>
                        <DateField source="created_at" showTime />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Последна промяна:
                        </Typography>
                        <DateField source="updated_at" showTime />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
        </SimpleShowLayout>
    </Show>
);