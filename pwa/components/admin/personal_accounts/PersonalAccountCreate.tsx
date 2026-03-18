import { useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
    AutocompleteInput,
    Create,
    NumberInput,
    ReferenceInput,
    SimpleForm,
    required,
    useDataProvider,
    useGetList,
} from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';

const PJM_POSITION_NAME = 'Машинист ПЖМ';

const formatEmployeeName = (record: any) => {
    if (!record) {
        return '';
    }

    const name = [record.first_name, record.middle_name, record.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

    return name || record.employee_name || record['@id'] || '';
};

const formatMonthlyScheduleName = (record: any) => {
    if (!record) {
        return '';
    }

    const month = record.month ? String(record.month).padStart(2, '0') : '--';
    const year = record.year ?? '----';
    const positionName = record?.position?.name ? `, ${record.position.name}` : '';

    return `${month}.${year}${positionName}`;
};

const toPositionIri = (record: any): string => {
    if (!record) {
        return '';
    }

    if (typeof record?.['@id'] === 'string' && record['@id'].trim()) {
        return record['@id'].trim();
    }

    if (record?.id !== undefined && record?.id !== null) {
        return `/positions/${record.id}`;
    }

    return '';
};

const PersonalAccountDefaults = ({ pjmPositionIri }: { pjmPositionIri: string }) => {
    const { setValue } = useFormContext();
    const dataProvider = useDataProvider();
    const selectedSchedule = useWatch({ name: 'monthly_schedule' });

    useEffect(() => {
        if (!pjmPositionIri) {
            return;
        }

        setValue('position', pjmPositionIri, { shouldDirty: false, shouldValidate: true });
    }, [pjmPositionIri, setValue]);

    useEffect(() => {
        const scheduleId = String(selectedSchedule ?? '').trim();
        if (!scheduleId) {
            return;
        }

        dataProvider.getOne('monthly_schedules', { id: scheduleId })
            .then((result: any) => {
                const data = result?.data;
                const year = Number(data?.year);
                const month = Number(data?.month);

                if (Number.isFinite(year)) {
                    setValue('year', year, { shouldDirty: true, shouldValidate: true });
                }

                if (Number.isFinite(month)) {
                    setValue('month', month, { shouldDirty: true, shouldValidate: true });
                }
            })
            .catch(() => {
                // Keep manual values if schedule metadata cannot be resolved.
            });
    }, [dataProvider, selectedSchedule, setValue]);

    return (
        <Box mb={1}>
            <Typography variant="body2" fontWeight={700}>
                Длъжност: {PJM_POSITION_NAME}
            </Typography>
        </Box>
    );
};

export const PersonalAccountCreate = () => {
    const date = new Date();
    const { data: positions = [] } = useGetList('positions', {
        filter: { name: PJM_POSITION_NAME },
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
    });

    const pjmPosition = useMemo(() => {
        return (
            positions.find((position: any) => String(position?.name ?? '').toLowerCase() === PJM_POSITION_NAME.toLowerCase())
            || positions[0]
            || null
        );
    }, [positions]);

    const pjmPositionIri = useMemo(() => toPositionIri(pjmPosition), [pjmPosition]);

    const transform = (data: any) => ({
        ...data,
        position: pjmPositionIri || data?.position,
    });

    return (
        <Create redirect="edit" transform={transform}>
            <SimpleForm>
                <PersonalAccountDefaults pjmPositionIri={pjmPositionIri} />

                <ReferenceInput
                    source="employee"
                    reference="employees"
                    sort={{ field: 'first_name', order: 'ASC' }}
                    filter={pjmPositionIri ? { position: pjmPositionIri } : {}}
                >
                    <AutocompleteInput
                        label="Машинист"
                        optionText={formatEmployeeName}
                        validate={required()}
                        disabled={!pjmPositionIri}
                        fullWidth
                    />
                </ReferenceInput>

                <ReferenceInput
                    source="monthly_schedule"
                    reference="monthly_schedules"
                    sort={{ field: 'id', order: 'DESC' }}
                    filter={pjmPositionIri ? { position: pjmPositionIri } : {}}
                >
                    <AutocompleteInput
                        label="Месечен график"
                        optionText={formatMonthlyScheduleName}
                        validate={required()}
                        disabled={!pjmPositionIri}
                        fullWidth
                    />
                </ReferenceInput>

                <NumberInput source="year" label="Година" defaultValue={date.getFullYear()} validate={required()} />
                <NumberInput source="month" label="Месец" defaultValue={date.getMonth() + 1} validate={required()} />
            </SimpleForm>
        </Create>
    );
};
