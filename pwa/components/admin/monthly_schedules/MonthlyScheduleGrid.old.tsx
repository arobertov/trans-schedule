import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useDataProvider, useNotify, useRecordContext, useUpdate } from "react-admin";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, Select, MenuItem } from "@mui/material";

interface ScheduleRow {
    employee_id: number;
    employee_name: string;
    matrix_row?: number | string;
    // Keys like 'day_1', 'day_2' etc.
    [key: string]: any;
}

// Lightweight Input Component for Cells
const DayInput = memo(({ value, onChange }: { value: any, onChange: (val: string) => void }) => {
    return (
        <input 
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ 
                width: '100%', 
                textAlign: 'center', 
                padding: '6px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                color: 'inherit'
            }}
        />
    );
}, (prev, next) => prev.value === next.value);

DayInput.displayName = 'DayInput';

// Memoized Row Component
const ScheduleRowItem = memo(({ 
    row, 
    rowIndex, 
    daysArray, 
    isDriverPosition, 
    onCellChange, 
    onMatrixRowChange, 
    onMatrixImport 
}: any) => {
    return (
        <TableRow hover>
            <TableCell 
                component="th" 
                scope="row"
                style={{ 
                    position: 'sticky', 
                    left: 0, 
                    background: '#fff', 
                    zIndex: 5, 
                    borderRight: '1px solid #e0e0e0',
                    padding: '6px 16px',
                    whiteSpace: 'nowrap'
                }}
            >
                {row.employee_name}
            </TableCell>
            {isDriverPosition && (
                <TableCell style={{ position: 'sticky', left: 150, background: '#fff', zIndex: 5, borderRight: '1px solid #e0e0e0', padding: '0 8px' }}>
                    <input 
                        value={row.matrix_row || ''} 
                        onChange={(e) => onMatrixRowChange(rowIndex, e.target.value)}
                        onBlur={(e) => onMatrixImport(rowIndex, e.target.value)}
                        placeholder="#"
                        style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'center' }}
                    />
                </TableCell>
            )}
            {daysArray.map((d: number) => (
                <TableCell key={d} padding="none" style={{ borderRight: '1px solid #f0f0f0', minWidth: 40 }}>
                     <DayInput 
                        value={row[`day_${d}`]} 
                        onChange={(val) => onCellChange(rowIndex, `day_${d}`, val)} 
                    />
                </TableCell>
            ))}
        </TableRow>
    );
}, (prev, next) => prev.row === next.row && prev.daysArray === next.daysArray && prev.isDriverPosition === next.isDriverPosition);

ScheduleRowItem.displayName = 'ScheduleRowItem';

export const MonthlyScheduleGrid = () => {
    const record = useRecordContext();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const [rows, setRows] = useState<ScheduleRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadedRecordId, setLoadedRecordId] = useState<any>(null);
    const [update] = useUpdate();
    const [matrices, setMatrices] = useState<any[]>([]);
    const [selectedMatrix, setSelectedMatrix] = useState<string>('');
    const [isDriverPosition, setIsDriverPosition] = useState(false);
    const showMatrixUI = true; // Re-enable Matrix UI now that performance is optimized

    // Effect to determine if position is "Машинист ПЖМ"
    useEffect(() => {
        if (!record) return;
        
        const checkPosition = async () => {
            // 1. Check if name is already in record
            const nameInRecord = record.position?.name;
            if (nameInRecord === 'Машинист ПЖМ') {
                setIsDriverPosition(true);
                return;
            }

            // 2. If not, fetch the position details
            const positionId = typeof record.position === 'object' ? record.position.id : record.position;
            if (positionId) {
                try {
                    // Use a simple cache or just fetch. React-admin dataProvider usually caches getOne.
                    const { data } = await dataProvider.getOne('positions', { id: positionId });
                    if (data && data.name === 'Машинист ПЖМ') {
                        setIsDriverPosition(true);
                    } else {
                        setIsDriverPosition(false);
                    }
                } catch (e) {
                    console.error("Error fetching position details:", e);
                    setIsDriverPosition(false);
                }
            }
        };
        
        checkPosition();
    }, [record?.position, dataProvider]);

    // Fetch Employees and Initialize Rows
    useEffect(() => {
        if (!record || !record.id) return;
        if (record.id === loadedRecordId) return;
        
        const init = async () => {
            setLoading(true);
            try {
                // 1. Get existing rows from record
                const existingRows = record.schedule_rows || [];
                
                // 2. Fetch Active Employees for Position
                const positionId = typeof record.position === 'object' ? record.position.id : record.position;
                console.log("Fetching employees for position ID:", positionId);
                if (positionId) {
                    const { data: employees } = await dataProvider.getList('employees', {
                        filter: { position: positionId, status: 'активен' },
                        pagination: { page: 1, perPage: 1000 },
                        sort: { field: 'id', order: 'ASC' }
                    });

                    console.log("Fetched Employees:", employees);

                    // 3. Merge
                    const mergedRows = employees.map((emp: any) => {
                        const existing = existingRows.find((r: any) => r.employee_id === emp.id);
                        if (existing) return existing;
                        
                        return {
                            employee_id: emp.id,
                            employee_name: `${emp.first_name} ${emp.middle_name} ${emp.last_name}`,
                            matrix_row: '',
                        };
                    });
                    console.log("Merged Rows:", mergedRows);
                    setRows(mergedRows);
                }
                console.log("Loaded schedule data for record", record.id);
                setLoadedRecordId(record.id);
            } catch (error) {
                console.error("Error loading schedule data", error);
                // Prevent infinite retries on error
                setLoadedRecordId(record.id);
                notify("Грешка при зареждане на служители", { type: 'error' });
            } finally {
                setLoading(false);
                console.log("Finished loading schedule data", loading);
            }
        };
        init();
        console.log("Effect triggered for record ID:", record.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.id]);
    
   
    // Fetch Matrices for the same period to allow selection
    useEffect(() => {
        console.log("Fetching matrices for year/month:", record.year, record.month);
        if (!record || !isDriverPosition) return;
        const fetchMatrices = async () => {
            try {
                 // Assuming we can search matrices by year/month or just list all
                const { data } = await dataProvider.getList('matrices', {
                     filter: { year: record.year, month: record.month },
                     pagination: { page: 1, perPage: 20 },
                     sort: { field: 'id', order: 'DESC' }
                });
                setMatrices(data);
                console.log("Fetched Matrices @@@@@@@@@@:", data);
                if (data.length > 0) setSelectedMatrix(data[0].id);
            } catch (e) {
                console.error(e);
            }
        };
        fetchMatrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.year, record?.month, dataProvider, isDriverPosition]);

    const daysInMonth = record ? new Date(record.year, record.month, 0).getDate() : 30;
    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const handleCellChange = useCallback((rowIndex: number, field: string, value: any) => {
        setRows(prevRows => {
            if (prevRows[rowIndex][field] === value) return prevRows;
            const newRows = [...prevRows];
            newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
            return newRows;
        });
    }, []);

    const handleMatrixRowChange = useCallback((rowIndex: number, value: any) => {
        setRows(prevRows => {
             const newRows = [...prevRows];
             newRows[rowIndex] = { ...newRows[rowIndex], matrix_row: value };
             return newRows;
        });
    }, []);

    const handleSave = async () => {
        if (!record) return;
        try {
            await update('monthly_schedules', { 
                id: record.id, 
                data: { ...record, schedule_rows: rows }, 
                previousData: record 
            });
            notify("Графикът е записан успешно", { type: 'success' });
        } catch (error) {
             notify("Грешка при запис", { type: 'error' });
        }
    };
    
    // NOTE: This function depends on 'selectedMatrix' and 'matrices' state.
    const importMatrixRow = useCallback(async (rowIndex: number, matrixRowIndex: string) => {
        if (!selectedMatrix || !matrixRowIndex) return;
        
        try {
             // We need to fetch the SINGLE matrix again to get full details including rows?
             // Or if 'matrices' list already has it? Usually list logic is lightweight.
             // Lets fetch full matrix object just in case rows are not in list view.
             const { data: matrix } = await dataProvider.getOne('matrices', { id: selectedMatrix });
             if (!matrix || !matrix.rows) return;
             
             const targetRow = matrix.rows.find((r: any) => r.row == matrixRowIndex);
             
             if (targetRow && targetRow.cells) {
                 setRows(currentRows => {
                     const newRows = [...currentRows];
                     const rowData = { ...newRows[rowIndex] };
                     
                     targetRow.cells.forEach((cell: any, index: number) => {
                         const day = index + 1;
                         if (day <= daysInMonth) {
                             rowData[`day_${day}`] = cell.value;
                         }
                     });
                     newRows[rowIndex] = rowData;
                     return newRows;
                 });
                 notify("Данните са заредени от матрицата", { type: 'success' });
             } else {
                 notify("Не е намерен ред в матрицата", { type: 'warning' });
             }

        } catch (e) {
            notify("Грешка при зареждане от матрица", { type: 'error' });
        }
    }, [selectedMatrix, dataProvider, notify, daysInMonth]);
    if (loading) return <Typography>Зареждане...</Typography>;

    console.log(`Rendering MonthlyScheduleGrid with isDriverPosition: ${isDriverPosition} and showMatrixUI: ${showMatrixUI}`);

    return (
        <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Box mb={2} display="flex" gap={2} alignItems="center">
                {console.log("Rendering MonthlyScheduleGrid with isDriverPosition:", isDriverPosition, "and showMatrixUI:", showMatrixUI)}
                {isDriverPosition && showMatrixUI && (
                    <>
                        <Typography>Матрица за импорт (Машинисти):</Typography>
                        <Select size="small" value={selectedMatrix} onChange={(e) => setSelectedMatrix(e.target.value)}>
                            <MenuItem value="">-- Избери --</MenuItem>
                            {matrices.map(m => (
                                <MenuItem key={m.id} value={m.id}>
                                    #{m.id} - {m.year}/{m.month} (Start: {m.start_position})
                                </MenuItem>
                            ))}
                        </Select>
                    </>
                )}
                <Button variant="contained" onClick={handleSave}>Запис</Button>
            </Box>
            <TableContainer component={Paper} sx={{ maxHeight: '80vh' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ minWidth: 200, zIndex: 10, left: 0, position: 'sticky', background: '#f5f5f5' }}>
                                Служител
                            </TableCell>
                            {isDriverPosition && showMatrixUI && (
                                <TableCell style={{ minWidth: 80, zIndex: 10, left: 150, position: 'sticky', background: '#f5f5f5' }}>
                                    Мат. Ред
                                </TableCell>
                            )}
                            {daysArray.map(d => (
                                <TableCell key={d} align="center" style={{ minWidth: 80, padding: 2, background: '#f5f5f5' }}>
                                    {d}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <ScheduleRowItem 
                                key={row.employee_id}
                                rowIndex={index}
                                row={row}
                                daysArray={daysArray}
                                isDriverPosition={isDriverPosition && showMatrixUI}
                                onCellChange={handleCellChange}
                                onMatrixRowChange={handleMatrixRowChange}
                                onMatrixImport={importMatrixRow}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer> 
        </Box>
    );
};
