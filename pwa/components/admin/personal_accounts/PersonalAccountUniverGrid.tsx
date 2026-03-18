import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useDataProvider, useNotify, useRecordContext, useRefresh } from 'react-admin';
import { formatDecimalBg, formatMinutesToHHMM, parseDecimal } from './timeFormat';

const COLUMNS = ['Дата', 'Смяна', 'Отработено време', 'Нощен труд', 'Километри', 'Протокол ДПК'];
const SUMMARY_HEADERS = [
    'Индивид. норма',
    'Корекция 1,143',
    'Отработ. време',
    'Нощен труд',
    'Килом. общо',
    'Отр. време + Корекция 1,143',
    'Нулево време',
    'Нощен труд x24',
    '(+/-) за минал месец',
    '(+/-) за текущ месец',
    'Общо за периода',
];
const BG_MONTH_NAMES: Record<number, string> = {
    1: 'ЯНУАРИ',
    2: 'ФЕВРУАРИ',
    3: 'МАРТ',
    4: 'АПРИЛ',
    5: 'МАЙ',
    6: 'ЮНИ',
    7: 'ЮЛИ',
    8: 'АВГУСТ',
    9: 'СЕПТЕМВРИ',
    10: 'ОКТОМВРИ',
    11: 'НОЕМВРИ',
    12: 'ДЕКЕМВРИ',
};
const HOLIDAY_BG = '#A7A7A7';
const HEADER_BG = '#EEECE1';
const BORDER_COLOR = '#000000';

const parseDayFromValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const day = Math.trunc(value);
        return day >= 1 && day <= 31 ? day : null;
    }

    const raw = String(value ?? '').trim();
    if (!raw) {
        return null;
    }

    if (/^\d{1,2}$/.test(raw)) {
        const day = Number(raw);
        return day >= 1 && day <= 31 ? day : null;
    }

    const ddmmyyyy = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (ddmmyyyy?.[1]) {
        const day = Number(ddmmyyyy[1]);
        return day >= 1 && day <= 31 ? day : null;
    }

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso?.[3]) {
        const day = Number(iso[3]);
        return day >= 1 && day <= 31 ? day : null;
    }

    return null;
};

export const PersonalAccountUniverGrid = () => {
    const record = useRecordContext<any>();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    const [saving, setSaving] = useState(false);
    const [protocolByDay, setProtocolByDay] = useState<Record<number, string>>({});
    const [calendarNonWorkingDays, setCalendarNonWorkingDays] = useState<Set<number>>(new Set());

    const rows = useMemo(() => (Array.isArray(record?.detail_rows) ? record.detail_rows : []), [record?.detail_rows]);
    const safeYear = Number.isFinite(Number(record?.year)) ? Number(record?.year) : new Date().getFullYear();
    const safeMonth = Number.isFinite(Number(record?.month)) ? Number(record?.month) : 1;

    const toIsoDate = (day: number): string => {
        const mm = String(safeMonth).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${safeYear}-${mm}-${dd}`;
    };

    const { dayRows, extraRows, daysInMonth } = useMemo(() => {
        const monthDays = new Date(safeYear, safeMonth, 0).getDate();

        const byDay = new Map<number, any>();
        const remainder: any[] = [];

        rows.forEach((row: any) => {
            const day = parseDayFromValue(row?.date);
            if (day && day >= 1 && day <= monthDays && !byDay.has(day)) {
                byDay.set(day, row);
                return;
            }

            remainder.push(row);
        });

        const normalizedRows = Array.from({ length: monthDays }, (_, idx) => {
            const day = idx + 1;
            const existing = byDay.get(day) || {};
            return {
                ...existing,
                date: day,
                shift: existing?.shift ?? '',
                worked_time: existing?.worked_time ?? '',
                night_work: existing?.night_work ?? '',
                kilometers: existing?.kilometers ?? '',
                protocol_dpk: existing?.protocol_dpk ?? '',
                kilometers_total: existing?.kilometers_total ?? '',
            };
        });

        return {
            dayRows: normalizedRows,
            extraRows: remainder,
            daysInMonth: monthDays,
        };
    }, [record?.month, record?.year, rows, safeMonth, safeYear]);

    useEffect(() => {
        const initial: Record<number, string> = {};
        dayRows.forEach((row: any, index: number) => {
            const protocol = parseDecimal(row?.protocol_dpk ?? '');
            const baseKm = parseDecimal(row?.kilometers ?? '');
            const totalKm = parseDecimal(row?.kilometers_total ?? '');
            const derivedProtocol = Number((totalKm - baseKm).toFixed(2));

            if (protocol !== 0) {
                initial[index + 1] = String(row?.protocol_dpk ?? protocol);
                return;
            }

            if (derivedProtocol !== 0) {
                initial[index + 1] = String(derivedProtocol).replace('.', ',');
                return;
            }

            initial[index + 1] = '';
        });
        setProtocolByDay(initial);
    }, [dayRows]);

    useEffect(() => {
        let isMounted = true;

        const loadCalendarNonWorkingDays = async () => {
            try {
                const year = Number(record?.year);
                const month = Number(record?.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) {
                    if (isMounted) setCalendarNonWorkingDays(new Set());
                    return;
                }

                const { data } = await dataProvider.getList('calendars', {
                    filter: { year },
                    sort: { field: 'id', order: 'DESC' },
                    pagination: { page: 1, perPage: 1 },
                });

                const calendar = Array.isArray(data) && data.length > 0 ? data[0] : null;
                const monthInfo = calendar?.monthsData?.[month] ?? null;
                const mapByDay = monthInfo?.daysMap ?? null;
                const nonWorking = new Set<number>();

                if (mapByDay && typeof mapByDay === 'object') {
                    Object.entries(mapByDay).forEach(([key, value]) => {
                        const day = Number(key);
                        const type = String((value as any)?.type ?? '').toLowerCase();
                        if (Number.isFinite(day) && (type === 'holiday' || type === 'weekend')) {
                            nonWorking.add(day);
                        }
                    });
                }

                if (isMounted) {
                    setCalendarNonWorkingDays(nonWorking);
                }
            } catch {
                if (isMounted) {
                    setCalendarNonWorkingDays(new Set());
                }
            }
        };

        void loadCalendarNonWorkingDays();

        return () => {
            isMounted = false;
        };
    }, [dataProvider, record?.month, record?.year]);

    const onProtocolChange = (day: number, value: string) => {
        setProtocolByDay((prev: Record<number, string>) => ({ ...prev, [day]: value }));
    };

    const isHolidayLikeDay = (day: number): boolean => {
        if (calendarNonWorkingDays.size > 0) {
            return calendarNonWorkingDays.has(day);
        }

        const year = Number(record?.year);
        const month = Number(record?.month);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
            return false;
        }

        const weekday = new Date(year, month - 1, day).getDay();
        return weekday === 0 || weekday === 6;
    };

    const saveProtocol = async () => {
        if (!record?.id) return;

        const nextRows = dayRows.map((row: any, index: number) => {
            const day = index + 1;
            const protocol = parseDecimal(protocolByDay[day] ?? row?.protocol_dpk ?? 0);
            return {
                ...row,
                date: toIsoDate(day),
                protocol_dpk: protocol,
            };
        });

        setSaving(true);
        try {
            await dataProvider.update('personal_accounts', {
                id: record.id,
                data: {
                    ...record,
                    detail_rows: [...nextRows, ...extraRows],
                },
                previousData: record,
            });
            notify('Протокол ДПК е запазен успешно.', { type: 'success' });
            refresh();
        } catch (error: any) {
            notify(error?.message || 'Грешка при запис на личната сметка.', { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const zeroTimeMinutes = Number.isFinite(Number(record?.zero_time_minutes))
        ? Number(record?.zero_time_minutes)
        : null;

    const summaryValues = [
        formatMinutesToHHMM(record?.individual_norm_minutes ?? 0),
        formatMinutesToHHMM(record?.night_correction_1143_minutes ?? 0),
        formatMinutesToHHMM(record?.worked_time_minutes ?? 0),
        formatMinutesToHHMM(record?.night_work_minutes ?? 0),
        formatDecimalBg(record?.kilometers_total ?? 0),
        formatMinutesToHHMM(record?.worked_with_correction_minutes ?? 0),
        zeroTimeMinutes === null ? '-' : formatMinutesToHHMM(zeroTimeMinutes),
        formatDecimalBg(record?.night_work_x24 ?? 0),
        formatMinutesToHHMM(record?.previous_month_balance_minutes ?? 0),
        formatMinutesToHHMM(record?.current_month_balance_minutes ?? 0),
        formatMinutesToHHMM(record?.period_total_minutes ?? 0),
    ];

    return (
        <Box>
            <Box mb={2} textAlign="center">
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 0.8 }}>ЛИЧНА СМЕТКА</Typography>
                <Typography variant="h6" fontWeight={700} mt={1} sx={{ letterSpacing: 0.2 }}>
                    на {String(record?.employee_name ?? '').toUpperCase()} - МАШИНИСТ ПЖМ
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} mt={1} sx={{ letterSpacing: 0.2 }}>
                    ЗА МЕСЕЦ {BG_MONTH_NAMES[Number(record?.month)] || record?.month} {record?.year} ГОД.
                </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderColor: BORDER_COLOR }}>
                <Table
                    size="small"
                    sx={{
                        '& th, & td': {
                            borderColor: BORDER_COLOR,
                            borderWidth: 1,
                            borderStyle: 'solid',
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            {COLUMNS.map((label) => (
                                <TableCell key={label} align="center" sx={{ fontWeight: 700, bgcolor: HEADER_BG }}>
                                    {label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.from({ length: daysInMonth }, (_, idx) => {
                            const day = idx + 1;
                            const row = dayRows[idx] || {};
                            const holidayLike = isHolidayLikeDay(day);

                            return (
                                <TableRow key={day} sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>
                                    <TableCell align="center" sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>{day}</TableCell>
                                    <TableCell align="center" sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>{row?.shift || ''}</TableCell>
                                    <TableCell align="center" sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>{row?.worked_time || ''}</TableCell>
                                    <TableCell align="center" sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>{row?.night_work || ''}</TableCell>
                                    <TableCell align="center" sx={holidayLike ? { bgcolor: HOLIDAY_BG } : undefined}>{String(row?.kilometers ?? '')}</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 120 }}>
                                        <TextField
                                            value={protocolByDay[day] ?? ''}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) => onProtocolChange(day, event.target.value)}
                                            size="small"
                                            variant="outlined"
                                            inputProps={{ style: { textAlign: 'center', padding: '6px 8px' } }}
                                            sx={{
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_COLOR },
                                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_COLOR },
                                                '& .MuiInputBase-input': { fontWeight: 500 },
                                                bgcolor: '#fff',
                                            }}
                                            fullWidth
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER_COLOR }}>
                <Table
                    size="small"
                    sx={{
                        '& th, & td': {
                            borderColor: BORDER_COLOR,
                            borderWidth: 1,
                            borderStyle: 'solid',
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 700, bgcolor: HEADER_BG }}>Обобщени стойности</TableCell>
                            {SUMMARY_HEADERS.map((label) => (
                                <TableCell key={label} align="center" sx={{ fontWeight: 700, bgcolor: HEADER_BG }}>
                                    {label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Стойности</TableCell>
                            {summaryValues.map((value, index) => (
                                <TableCell key={`${SUMMARY_HEADERS[index]}-${index}`} align="center" sx={{ fontWeight: 700 }}>
                                    {value}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button variant="contained" onClick={saveProtocol} disabled={saving}>
                    {saving ? 'Запис...' : 'Запиши Протокол ДПК'}
                </Button>
            </Box>
        </Box>
    );
};
