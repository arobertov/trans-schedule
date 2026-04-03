import React, { useMemo, useState, useCallback } from 'react';
import { useRecordContext, DateField, useUpdate, useNotify } from 'react-admin';
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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField as MuiTextField,
    CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';

// Extracts "HH:MM" from an ISO datetime or time string, treating it as UTC.
const toTimeInput = (isoStr: string | null | undefined): string => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

interface EditState {
    iri: string;      // full IRI e.g. /api/train_schedule_lines/10204
    rawId: number;    // numeric id for local state matching
    train_number: string;
    station_track: string;
    arrival_time: string;   // "HH:MM" or ""
    departure_time: string; // "HH:MM" or ""
}

export const TrainListAccordion = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const [update, { isPending }] = useUpdate();

    // Local writable copy — saves are applied here without re-fetching the whole schedule
    const [lines, setLines] = useState<any[]>(() => record?.lines ?? []);

    // Single edit dialog state; null = closed
    const [editTarget, setEditTarget] = useState<EditState | null>(null);

    if (!record) return null;

    const groupedData = useMemo(() => {
        if (!lines.length) return {};
        const groups: Record<string, any[]> = {};
        lines.forEach(line => {
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
    }, [lines]);

    const openEdit = useCallback((line: any) => {
        // Prefer the JSON-LD @id IRI; fall back to constructing it from the numeric id.
        const iri: string = line['@id'] ?? `/train_schedule_lines/${line.id}`;
        setEditTarget({
            iri,
            rawId: line.id,
            train_number: line.train_number ?? '',
            station_track: line.station_track ?? '',
            arrival_time: toTimeInput(line.arrival_time),
            departure_time: toTimeInput(line.departure_time),
        });
    }, []);

    const handleSave = useCallback(() => {
        if (!editTarget) return;
        update(
            'train_schedule_lines',
            {
                id: editTarget.iri,
                data: {
                    train_number: editTarget.train_number,
                    station_track: editTarget.station_track,
                    arrival_time: editTarget.arrival_time ? `${editTarget.arrival_time}:00` : null,
                    departure_time: editTarget.departure_time ? `${editTarget.departure_time}:00` : null,
                },
                previousData: {},
            },
            {
                onSuccess: (updated: any) => {
                    setLines(prev => prev.map(l => l.id === editTarget.rawId ? { ...l, ...updated } : l));
                    setEditTarget(null);
                    notify('Записът е обновен', { type: 'success' });
                },
                onError: (err: any) => {
                    notify(`Грешка: ${err.message}`, { type: 'error' });
                },
            }
        );
    }, [editTarget, update, notify]);

    if (!lines.length) return <Typography>Няма намерени данни</Typography>;

    // Sort train numbers
    const sortedTrainNumbers = Object.keys(groupedData).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });

    return (
        <>
        <Box sx={{ mt: 2 }}>
            {sortedTrainNumbers.map(trainNum => (
                <Accordion key={trainNum} TransitionProps={{ unmountOnExit: true }}>
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
                                    <TableCell sx={{ width: 48 }} />
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
                                        <TableCell padding="none">
                                            <IconButton size="small" onClick={() => openEdit(line)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>

        {/* Single dialog instance — mounts only when a row is being edited */}
        <Dialog
            open={!!editTarget}
            onClose={() => !isPending && setEditTarget(null)}
            keepMounted={false}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>Редактирай ред</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                <MuiTextField
                    label="Влак №"
                    value={editTarget?.train_number ?? ''}
                    onChange={e => setEditTarget(prev => prev && { ...prev, train_number: e.target.value })}
                    size="small"
                    fullWidth
                />
                <MuiTextField
                    label="Станция / Коловоз"
                    value={editTarget?.station_track ?? ''}
                    onChange={e => setEditTarget(prev => prev && { ...prev, station_track: e.target.value })}
                    size="small"
                    fullWidth
                />
                <MuiTextField
                    label="Пристига"
                    type="time"
                    value={editTarget?.arrival_time ?? ''}
                    onChange={e => setEditTarget(prev => prev && { ...prev, arrival_time: e.target.value })}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                />
                <MuiTextField
                    label="Заминава"
                    type="time"
                    value={editTarget?.departure_time ?? ''}
                    onChange={e => setEditTarget(prev => prev && { ...prev, departure_time: e.target.value })}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditTarget(null)} disabled={isPending}>Отказ</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} /> : null}
                >
                    Запази
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
};
