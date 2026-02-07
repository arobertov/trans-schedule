import React, { useMemo } from 'react';
import { useGetManyReference, useRecordContext, DateField } from 'react-admin';
import { 
    Accordion, 
    AccordionSummary, 
    AccordionDetails, 
    Typography, 
    Box, 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow,
    CircularProgress 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export const TrainListAccordion = () => {
    const record = useRecordContext();
    if (!record) return null;

    const { data, isLoading, error } = useGetManyReference(
        'train_schedule_lines',
        { 
            target: 'trainSchedule', 
            id: record.id, 
            pagination: { page: 1, perPage: 100000 }, 
            sort: { field: 'train_number', order: 'ASC' } 
        }
    );

    const groupedData = useMemo(() => {
        if (!data) return {};
        const groups: Record<string, any[]> = {};
        data.forEach(line => {
            const trainNum = line.train_number;
            if (!groups[trainNum]) {
                groups[trainNum] = [];
            }
            groups[trainNum].push(line);
        });
        
        // Sort lines within each group by arrival_time
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const t1 = a.arrival_time || a.departure_time || '';
                const t2 = b.arrival_time || b.departure_time || '';
                return t1.localeCompare(t2);
            });
        });

        return groups;
    }, [data]);

    if (isLoading) return <CircularProgress />;
    if (error) return <Typography color="error">Error loading data</Typography>;
    if (!data || data.length === 0) return <Typography>Няма намерени данни</Typography>;

    // Sort train numbers
    const sortedTrainNumbers = Object.keys(groupedData).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });

    return (
        <Box sx={{ mt: 2 }}>
            {sortedTrainNumbers.map(trainNum => (
                <Accordion key={trainNum}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'bold' }}>Влак {trainNum}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Станция / Път №</TableCell>
                                    <TableCell>Пристига</TableCell>
                                    <TableCell>Заминава</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groupedData[trainNum].map((line: any) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.station_track}</TableCell>
                                        <TableCell>
                                            {line.arrival_time ? (
                                                <DateField record={line} source="arrival_time" showDate={false} showTime options={{ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }} />
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {line.departure_time ? (
                                                <DateField record={line} source="departure_time" showDate={false} showTime options={{ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }} />
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};
