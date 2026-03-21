import { useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Datagrid, FunctionField, List, useDataProvider } from 'react-admin';
import { Link, useParams } from 'react-router-dom';
import { getToken } from '../../../jwt-frontend-auth/src/auth/authService';
import { formatDecimalBg, formatMinutesToHHMM } from './timeFormat';

const BG_MONTH_NAMES: Record<number, string> = {
    1: 'Януари',
    2: 'Февруари',
    3: 'Март',
    4: 'Април',
    5: 'Май',
    6: 'Юни',
    7: 'Юли',
    8: 'Август',
    9: 'Септември',
    10: 'Октомври',
    11: 'Ноември',
    12: 'Декември',
};

const resolvePersonalAccountId = (record: any): string => {
    const raw = record?.id ?? record?.['@id'];
    if (raw === null || raw === undefined) {
        return '';
    }

    return String(raw).trim();
};

const toRoutePersonalAccountId = (id: string): string => {
    const iriMatch = id.match(/\/personal_accounts\/([^/?#]+)\/?(?:[?#].*)?$/);
    if (iriMatch?.[1]) {
        return iriMatch[1];
    }

    const trailingSegment = id.match(/([^/?#]+)\/?(?:[?#].*)?$/);
    if (trailingSegment?.[1]) {
        return trailingSegment[1];
    }

    return id;
};

const normalizeEmployeeName = (value: unknown): string => String(value ?? '').trim().toLocaleLowerCase('bg-BG');
const normalizeEmployeeId = (value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return '';
    }

    const iriMatch = raw.match(/\/employees\/([^/?#]+)\/?(?:[?#].*)?$/);
    if (iriMatch?.[1]) {
        return iriMatch[1];
    }

    return raw;
};

const PersonalAccountsMonthList = ({ year, month }: { year: number; month: number }) => {
    const dataProvider = useDataProvider();
    const [scheduleOrderByName, setScheduleOrderByName] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        let isMounted = true;

        const loadScheduleOrder = async () => {
            try {
                const { data: members } = await dataProvider.getList('monthly_schedules', {
                    filter: { year, month },
                    sort: { field: 'id', order: 'DESC' },
                    pagination: { page: 1, perPage: 100 },
                });

                const scheduleCandidates = members
                    .map((item: any) => item?.id ?? item?.['@id'])
                    .filter((value: any) => value !== null && value !== undefined)
                    .map((value: any) => String(value));

                let resolvedRows: any[] = [];

                for (const candidateId of scheduleCandidates) {
                    try {
                        const { data: detailPayload } = await dataProvider.getOne('monthly_schedules', {
                            id: candidateId,
                        });

                        const maybeRows = Array.isArray((detailPayload as any)?.schedule_rows)
                            ? (detailPayload as any).schedule_rows
                            : [];
                        if (maybeRows.length > 0) {
                            resolvedRows = maybeRows;
                            break;
                        }
                    } catch {
                        continue;
                    }
                }

                const orderMapByName = new Map<string, number>();
                const missingNameEmployeeIds = new Set<string>();

                resolvedRows.forEach((row: any, index: number) => {
                    const employeeIdKey = normalizeEmployeeId(row?.employee_id);

                    const nameKey = normalizeEmployeeName(row?.employee_name);
                    if (nameKey && !orderMapByName.has(nameKey)) {
                        orderMapByName.set(nameKey, index + 1);
                        return;
                    }

                    if (employeeIdKey) {
                        missingNameEmployeeIds.add(employeeIdKey);
                    }
                });

                if (missingNameEmployeeIds.size > 0) {
                    try {
                        const { data: employees } = await dataProvider.getMany('employees', {
                            ids: Array.from(missingNameEmployeeIds),
                        });

                        const nameById = new Map<string, string>();
                        (Array.isArray(employees) ? employees : []).forEach((employee: any) => {
                            const id = normalizeEmployeeId(employee?.id ?? employee?.['@id']);
                            const fullName = [employee?.first_name, employee?.middle_name, employee?.last_name]
                                .filter(Boolean)
                                .join(' ')
                                .trim();

                            if (id && fullName) {
                                nameById.set(id, fullName);
                            }
                        });

                        resolvedRows.forEach((row: any, index: number) => {
                            const existingName = normalizeEmployeeName(row?.employee_name);
                            if (existingName) {
                                return;
                            }

                            const employeeIdKey = normalizeEmployeeId(row?.employee_id);
                            const resolvedName = nameById.get(employeeIdKey);
                            const nameKey = normalizeEmployeeName(resolvedName);
                            if (nameKey && !orderMapByName.has(nameKey)) {
                                orderMapByName.set(nameKey, index + 1);
                            }
                        });
                    } catch {
                        // If employee lookup fails we keep numbering only for rows with names.
                    }
                }

                if (isMounted) {
                    setScheduleOrderByName(orderMapByName);
                }
            } catch {
                if (isMounted) {
                    setScheduleOrderByName(new Map());
                }
            }
        };

        void loadScheduleOrder();

        return () => {
            isMounted = false;
        };
    }, [dataProvider, month, year]);

    return (
        <Box>
            <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">
                    Лични сметки за {BG_MONTH_NAMES[month] || `Месец ${month}`} {year}
                </Typography>
                <Button component={Link} to="/personal_accounts" variant="outlined" size="small">
                    Назад към личните сметки по месеци
                </Button>
            </Box>

            <List resource="personal_accounts" filter={{ year, month }} sort={{ field: 'employee_name', order: 'ASC' }} perPage={100} actions={false}>
                <Datagrid bulkActionButtons={false} rowClick={false}>
                    <FunctionField
                        label="№"
                        render={(record: any) => {
                            const key = normalizeEmployeeName(record?.employee_name);
                            const orderByName = scheduleOrderByName.get(key);
                            return orderByName ?? '-';
                        }}
                    />
                    <FunctionField
                        label="Машинист"
                        render={(record: any) => {
                            const accountId = resolvePersonalAccountId(record);
                            if (!accountId) {
                                return record?.employee_name || '---';
                            }

                            const routeId = toRoutePersonalAccountId(accountId);

                            return (
                                <Link to={`/personal-accounts-period/${year}/${month}/${encodeURIComponent(routeId)}`}>
                                    {record?.employee_name || '---'}
                                </Link>
                            );
                        }}
                    />
                    <FunctionField label="Индивид. норма" render={(record: any) => formatMinutesToHHMM(record?.individual_norm_minutes)} />
                    <FunctionField label="Отработ. време" render={(record: any) => formatMinutesToHHMM(record?.worked_time_minutes)} />
                    <FunctionField label="Корекция 1,143" render={(record: any) => formatMinutesToHHMM(record?.night_correction_1143_minutes)} />
                    <FunctionField label="Отр. време + Корекция" render={(record: any) => formatMinutesToHHMM(record?.worked_with_correction_minutes)} />
                    <FunctionField label="Килом. общо" render={(record: any) => formatDecimalBg(record?.kilometers_total)} />
                    <FunctionField label="Нощен труд" render={(record: any) => formatMinutesToHHMM(record?.night_work_minutes)} />
                    <FunctionField label="Нощен труд x24" render={(record: any) => formatDecimalBg(record?.night_work_x24)} />
                    <FunctionField label="(+/-) за минал месец" render={(record: any) => formatMinutesToHHMM(record?.previous_month_balance_minutes)} />
                    <FunctionField label="(+/-) за текущ месец" render={(record: any) => formatMinutesToHHMM(record?.current_month_balance_minutes)} />
                    <FunctionField label="Общо за периода" render={(record: any) => formatMinutesToHHMM(record?.period_total_minutes)} />
                </Datagrid>
            </List>
        </Box>
    );
};

const PersonalAccountsGroupedOverview = () => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadGrouped = async () => {
            setIsLoading(true);

            try {
                const token = getToken();
                const response = await fetch(`${window.origin}/personal_accounts_grouped`, {
                    headers: {
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });

                if (!response.ok) {
                    throw new Error('Неуспешно зареждане на обобщенията за лични сметки.');
                }

                const payload = await response.json();
                if (isMounted) {
                    setData(Array.isArray(payload?.items) ? payload.items : []);
                }
            } catch {
                if (isMounted) {
                    setData([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadGrouped();

        return () => {
            isMounted = false;
        };
    }, []);

    const grouped = useMemo(() => {
        const years = new Map<number, Map<number, number>>();

        data.forEach((item: any) => {
            const year = Number(item?.year);
            const month = Number(item?.month);
            const count = Number(item?.total ?? item?.count ?? 1);
            if (!Number.isFinite(year) || !Number.isFinite(month)) {
                return;
            }

            const monthMap = years.get(year) || new Map<number, number>();
            monthMap.set(month, (monthMap.get(month) || 0) + (Number.isFinite(count) ? count : 1));
            years.set(year, monthMap);
        });

        return Array.from(years.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([year, months]) => ({
                year,
                months: Array.from(months.entries())
                    .sort((a, b) => b[0] - a[0])
                    .map(([month, count]) => ({ month, count })),
            }));
    }, [data]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h6" mb={2}>Лични сметки по години и месеци</Typography>

            <Stack spacing={2}>
                {grouped.map((group) => (
                    <Paper key={group.year} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} mb={1}>Година {group.year}</Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {group.months.map(({ month, count }) => (
                                <Button
                                    key={`${group.year}-${month}`}
                                    component={Link}
                                    to={`/personal-accounts-period/${group.year}/${month}`}
                                    variant="contained"
                                    size="small"
                                >
                                    {BG_MONTH_NAMES[month] || `Месец ${month}`} ({count})
                                </Button>
                            ))}
                        </Stack>
                    </Paper>
                ))}
            </Stack>
        </Box>
    );
};

export const PersonalAccountsList = () => {
    const params = useParams<{ year?: string; month?: string }>();
    const parsedYear = Number(params?.year);
    const parsedMonth = Number(params?.month);

    if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
        return <PersonalAccountsMonthList year={parsedYear} month={parsedMonth} />;
    }

    return <PersonalAccountsGroupedOverview />;
};
