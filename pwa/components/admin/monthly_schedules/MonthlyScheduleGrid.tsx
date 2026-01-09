import { useState, useEffect, useCallback } from "react";
import { useDataProvider, useNotify, useRecordContext, useUpdate } from "react-admin";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, Select, MenuItem } from "@mui/material";

interface ScheduleRow {
    employee_id: number;
    employee_name: string;
    matrix_row?: number | string;
    // Keys like 'day_1', 'day_2' etc.
    [key: string]: any;
}

export const MonthlyScheduleGrid = () => {
    const record = useRecordContext();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const [rows, setRows] = useState<ScheduleRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [update] = useUpdate();
    const [matrices, setMatrices] = useState<any[]>([]);
    const [selectedMatrix, setSelectedMatrix] = useState<string>('');

    // Fetch Employees and Initialize Rows
    useEffect(() => {
        if (!record || !record.id) return;
        
        const init = async () => {
            setLoading(true);
            try {
                // 1. Get existing rows from record
                const existingRows = record.schedule_rows || [];
                
                // 2. Fetch Active Employees for Position
                // Assuming we can filter employees by position
                // Note: You might need to adjust the filter based on your API
                const positionId = typeof record.position === 'object' ? record.position.id : record.position;
                
                if (positionId) {
                    const { data: employees } = await dataProvider.getList('employees', {
                        filter: { position: positionId, status: 'активен' },
                        pagination: { page: 1, perPage: 100 },
                        sort: { field: 'id', order: 'ASC' }
                    });

                    // 3. Merge
                    const mergedRows = employees.map((emp: any) => {
                        const existing = existingRows.find((r: any) => r.employee_id === emp.id);
                        if (existing) return existing;
                        
                        return {
                            employee_id: emp.id,
                            employee_name: `${emp.first_name} ${emp.last_name}`,
                            matrix_row: '',
                        };
                    });
                     // Maintain user added rows if any (though usually strictly bound to employees)
                     // For now just use the employee list as source of truth for rows
                    setRows(mergedRows);
                }
            } catch (error) {
                console.error("Error loading schedule data", error);
                notify("Грешка при зареждане на служители", { type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [record, dataProvider, notify]);
    
    // Fetch Matrices for the same period to allow selection
    useEffect(() => {
        if (!record) return;
        const fetchMatrices = async () => {
            try {
                 // Assuming we can search matrices by year/month or just list all
                const { data } = await dataProvider.getList('matrices', {
                     filter: { year: record.year, month: record.month },
                     pagination: { page: 1, perPage: 20 },
                     sort: { field: 'id', order: 'DESC' }
                });
                setMatrices(data);
                if (data.length > 0) setSelectedMatrix(data[0].id);
            } catch (e) {
                console.error(e);
            }
        };
        fetchMatrices();
    }, [record, dataProvider]);

    const daysInMonth = record ? new Date(record.year, record.month, 0).getDate() : 30;
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleCellChange = (rowIndex: number, field: string, value: any) => {
        const newRows = [...rows];
        newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
        setRows(newRows);
    };

    const handleSave = async () => {
        if (!record) return;
        try {
            await update('monthly_schedules', { 
                id: record.id, 
                data: { schedule_rows: rows }, 
                previousData: record 
            });
            notify("Графикът е записан успешно", { type: 'success' });
        } catch (error) {
             notify("Грешка при запис", { type: 'error' });
        }
    };
    
    const importMatrixRow = async (rowIndex: number, matrixRowIndex: string) => {
        if (!selectedMatrix || !matrixRowIndex) return;
        
        try {
            // Fetch Matrix
             const { data: matrix } = await dataProvider.getOne('matrices', { id: selectedMatrix });
             if (!matrix || !matrix.rows) return;
             
             // Find row in matrix (assuming matrix.rows has structured data)
             // Matrix rows: [{ "row": 1, "cells": [...] }]
             const targetRow = matrix.rows.find((r: any) => r.row == matrixRowIndex);
             
             if (targetRow && targetRow.cells) {
                 const newRows = [...rows];
                 const rowData = newRows[rowIndex];
                 
                 // Map matrix cells to days
                 // Assuming matrix cells map to days 1..N
                 // Check matrix structure from earlier research: { value: "CM1", source_position: ... }
                 // Need to know how matrix cells map to dates. 
                 // Usually index 0 = day 1 ? Check Matrix.header
                 
                 targetRow.cells.forEach((cell: any, index: number) => {
                     const day = index + 1;
                     if (day <= daysInMonth) {
                         rowData[`day_${day}`] = cell.value; // Assign shift code
                     }
                 });
                 newRows[rowIndex] = rowData;
                 setRows(newRows);
                 notify("Данните са заредени от матрицата", { type: 'success' });
             } else {
                 notify("Не е намерен ред в матрицата", { type: 'warning' });
             }

        } catch (e) {
            notify("Грешка при зареждане от матрица", { type: 'error' });
        }
    };

    if (loading) return <Typography>Зареждане...</Typography>;

    return (
        <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Box mb={2} display="flex" gap={2} alignItems="center">
                <Typography>Матрица за импорт (Машинисти):</Typography>
                <Select size="small" value={selectedMatrix} onChange={(e) => setSelectedMatrix(e.target.value)}>
                    <MenuItem value="">-- Избери --</MenuItem>
                    {matrices.map(m => (
                        <MenuItem key={m.id} value={m.id}>
                            #{m.id} - {m.year}/{m.month} (Start: {m.start_position})
                        </MenuItem>
                    ))}
                </Select>
                 <Button variant="contained" onClick={handleSave}>Запис</Button>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ minWidth: 150, zIndex: 10, left: 0, position: 'sticky', background: '#fff' }}>Служител</TableCell>
                            <TableCell style={{ minWidth: 80, zIndex: 10, left: 150, position: 'sticky', background: '#fff' }}>Матрица Ред</TableCell>
                             {daysArray.map(d => (
                                <TableCell key={d} align="center" style={{ minWidth: 40, padding: 2 }}>{d}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={row.employee_id}>
                                <TableCell style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 5 }}>
                                    {row.employee_name}
                                </TableCell>
                                <TableCell style={{ position: 'sticky', left: 150, background: '#fff', zIndex: 5 }}>
                                    <TextField 
                                        size="small" 
                                        value={row.matrix_row || ''} 
                                        onChange={(e) => handleCellChange(index, 'matrix_row', e.target.value)}
                                        onBlur={(e) => importMatrixRow(index, e.target.value)}
                                        placeholder="#"
                                        sx={{ width: 60 }}
                                    />
                                </TableCell>
                                {daysArray.map(d => (
                                    <TableCell key={d} padding="none">
                                        <TextField
                                            variant="standard"
                                            InputProps={{ disableUnderline: true }}
                                            value={row[`day_${d}`] || ''}
                                            onChange={(e) => handleCellChange(index, `day_${d}`, e.target.value)}
                                            sx={{ 
                                                input: { 
                                                    textAlign: 'center', 
                                                    padding: '8px 2px',
                                                    fontSize: '0.8rem'
                                                } 
                                            }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
