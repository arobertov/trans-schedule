import { Datagrid, List, TextField, DateField, ReferenceField, NumberField, FunctionField, Create, Edit, SimpleForm, ReferenceInput, SelectInput, NumberInput, required, Show, useRecordContext, useInput, Toolbar, SaveButton } from "react-admin";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Button, useTheme, MenuItem, Select, FormControl } from "@mui/material";
import PrintIcon from '@mui/icons-material/Print';
import { useFormContext, Controller } from "react-hook-form";

// === Constants & Types ===
const DAY_TYPES = [
    { value: 'Делник', label: 'Д (Делник)', color: '#ffffff', darkColor: '#1e1e1e' }, // White / Dark Grey
    { value: 'Празник_Делник', label: 'П/Д (Празник-Делник)', color: '#ffe0b2', darkColor: '#5d4037' }, // Orange / Brown
    { value: 'Делник_Празник', label: 'Д/П (Делник-Празник)', color: '#bbdefb', darkColor: '#0d47a1' }, // Light Blue / Dark Blue
    { value: 'Делник_Празник_Делник', label: 'Д/П/Д (Сандвича)', color: '#e1bee7', darkColor: '#4a148c' }, // Purple / Dark Purple
    { value: 'Празник_Празник_Празник', label: 'П/П/П (Пълен Празник)', color: '#ffcdd2', darkColor: '#b71c1c' }, // Red / Dark Red
];

// Helper to get color
const getDayTypeColor = (type: string, isDark: boolean) => {
    const found = DAY_TYPES.find(d => d.value === type);
    return found ? (isDark ? found.darkColor : found.color) : (isDark ? '#1e1e1e' : '#ffffff');
};


// === List Component ===
const months = ['', 'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

export const MatrixList = () => (
    <List>
        <Datagrid rowClick="show">
            <NumberField source="year" label="Година" />
            <FunctionField source="month" label="Месец" render={(record: any) => months[record.month]} />
            <ReferenceField source="pattern" reference="order_patterns" label="Порядък">
                <TextField source="name" />
            </ReferenceField>
            <NumberField source="start_position" label="Начална позиция" />
            <DateField source="updated_at" label="Последна промяна" showTime />
        </Datagrid>
    </List>
);

// === Create Component ===
export const MatrixCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="pattern" reference="order_patterns" label="Порядък">
                <SelectInput optionText="name" validate={required()} />
            </ReferenceInput>
            <NumberInput source="year" label="Година" defaultValue={new Date().getFullYear()} validate={required()} />
            <SelectInput source="month" label="Месец" choices={[
                { id: 1, name: 'Януари' },
                { id: 2, name: 'Февруари' },
                { id: 3, name: 'Март' },
                { id: 4, name: 'Април' },
                { id: 5, name: 'Май' },
                { id: 6, name: 'Юни' },
                { id: 7, name: 'Юли' },
                { id: 8, name: 'Август' },
                { id: 9, name: 'Септември' },
                { id: 10, name: 'Октомври' },
                { id: 11, name: 'Ноември' },
                { id: 12, name: 'Декември' },
            ]} validate={required()} defaultValue={new Date().getMonth() + 1} />
            <NumberInput source="start_position" label="Начална позиция" defaultValue={1} min={1} validate={required()} />
        </SimpleForm>
    </Create>
);

// === Show Component (The Visual Matrix) ===
const MatrixView = () => {
    const record = useRecordContext();
    const theme = useTheme();

    if (!record || !record.
        header || !record.rows) return null;

    const { header, rows } = record;
    const isDark = theme.palette.mode === 'dark';

    // Theme-aware colors
    const borderColor = isDark ? theme.palette.divider : 'black';
    const headerBg = isDark ? theme.palette.grey[800] : '#f5f5f5';
    const rowHeaderBg = isDark ? theme.palette.grey[900] : '#e0e0e0';
    const weekendBg = isDark ? '#5d4037' : '#ffe0b2'; // Fallback
    const cellBg = isDark ? theme.palette.background.paper : 'white';
    const cellText = theme.palette.text.primary;

    return (
        <Box sx={{ overflowX: 'auto', p: 2 }}>
            <TableContainer component={Paper} sx={{ backgroundColor: cellBg, backgroundImage: 'none' }}>
                <Table size="small" aria-label="matrix table" sx={{ minWidth: 650, borderCollapse: 'collapse', border: `1px solid ${borderColor}` }}>
                    <TableHead>
                        {/* Row 1: Dates */}
                        <TableRow>
                            <TableCell 
                                align="center" 
                                sx={{ border: `1px solid ${borderColor}`, backgroundColor: headerBg, fontWeight: 'bold', color: cellText }}
                            >
                                Дата
                            </TableCell>
                            {header.map((col: any, index: number) => {
                                const dateObj = new Date(col.date);
                                const dayOfMonth = dateObj.getDate();
                                const bgColor = getDayTypeColor(col.day_type, isDark);
                                return (
                                    <TableCell 
                                        key={`date-${index}`} 
                                        align="center"
                                        sx={{ 
                                            border: `1px solid ${borderColor}`, 
                                            fontWeight: 'bold',
                                            color: cellText,
                                            backgroundColor: bgColor 
                                        }}
                                    >
                                        {dayOfMonth}
                                    </TableCell>
                                );
                            })}
                        </TableRow>

                        {/* Row 2: Weekdays */}
                        <TableRow>
                            <TableCell 
                                align="center"
                                sx={{ border: `1px solid ${borderColor}`, backgroundColor: headerBg, fontWeight: 'bold', color: cellText }}
                            >
                                Ден
                            </TableCell>
                            {header.map((col: any, index: number) => {
                                const bgColor = getDayTypeColor(col.day_type, isDark);
                                return (
                                <TableCell 
                                    key={`day-${index}`} 
                                    align="center"
                                    sx={{ 
                                        border: `1px solid ${borderColor}`, 
                                        fontWeight: 'bold',
                                        color: cellText,
                                        backgroundColor: bgColor
                                    }}
                                >
                                    {col.day}
                                </TableCell>
                            )})}
                        </TableRow>

                        {/* Row 3: Position Counter (from start_position) */}
                         <TableRow>
                            <TableCell 
                                align="center"
                                sx={{ border: `1px solid ${borderColor}`, backgroundColor: headerBg, fontWeight: 'bold', color: cellText }}
                            >
                                Ред №
                            </TableCell>
                            {rows.length > 0 && rows[0].cells.map((cell: any, index: number) => {
                                const colHeader = header[index];
                                const bgColor = getDayTypeColor(colHeader.day_type, isDark);
                                return (
                                    <TableCell 
                                        key={`pos-${index}`} 
                                        align="center"
                                        sx={{ 
                                            border: `1px solid ${borderColor}`, 
                                            fontWeight: 'bold',
                                            color: cellText,
                                            backgroundColor: bgColor
                                        }}
                                    >
                                        {cell.source_position}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((rowData: any, rowIndex: number) => (
                            <TableRow key={`row-${rowIndex}`}>
                                {/* Row Number Column */}
                                <TableCell 
                                    align="center"
                                    sx={{ 
                                        border: `1px solid ${borderColor}`, 
                                        backgroundColor: rowHeaderBg,
                                        fontWeight: 'bold',
                                        color: cellText
                                    }}
                                >
                                    {rowData.row}
                                </TableCell>

                                {/* Data Cells */}
                                {rowData.cells.map((cell: any, cellIndex: number) => {
                                    const colHeader = header[cellIndex];
                                    const bgColor = getDayTypeColor(colHeader.day_type, isDark);
                                    
                                    return (
                                        <TableCell 
                                            key={`cell-${rowIndex}-${cellIndex}`} 
                                            align="center"
                                            sx={{ 
                                                border: `1px solid ${borderColor}`,
                                                backgroundColor: bgColor,
                                                color: cellText
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: cell.value ? 'medium' : 'normal', color: 'inherit' }}>
                                                {cell.value || '-'}
                                            </Typography>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

const MatrixLayout = () => {
    const record = useRecordContext();
    const theme = useTheme();

    if (!record) return null;

    const months = ['', 'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];
    
    const isDark = theme.palette.mode === 'dark';
    const infoBoxBg = isDark ? theme.palette.grey[900] : '#f9f9f9';
    const infoBoxBorder = isDark ? theme.palette.grey[800] : '#eee';
    const linkColor = isDark ? theme.palette.primary.light : '#1976d2';

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box sx={{ p: 2, fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-content, #printable-content * {
                            visibility: visible;
                        }
                        #printable-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20px;
                        }
                        .no-print {
                            display: none !important;
                        }
                        /* Ensure table borders and colors print */
                        table {
                            border-collapse: collapse !important;
                        }
                        td, th {
                            border: 1px solid black !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}
            </style>

            <Box display="flex" justifyContent="flex-end" mb={2} className="no-print">
                <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                    Разпечатай
                </Button>
            </Box>

            <div id="printable-content">
                {/* Header Info - Inline */}
                <Box sx={{ display: 'flex', gap: 4, mb: 3, alignItems: 'center', flexWrap: 'wrap', backgroundColor: infoBoxBg, p: 2, borderRadius: 1, border: `1px solid ${infoBoxBorder}` }}>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                            Порядък
                        </Typography>
                        <ReferenceField source="pattern" reference="order_patterns" link="show">
                            <TextField 
                                source="name" 
                                sx={{ fontSize: '1.25rem', fontWeight: 600, color: linkColor, textDecoration: 'none' }} 
                            />
                        </ReferenceField>
                    </Box>
                    
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                            Година
                        </Typography>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                            {record.year}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                            Месец
                        </Typography>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                            {months[record.month]}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                            Начална позиция
                        </Typography>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                            {record.start_position}
                        </Typography>
                    </Box>
                </Box>

                <MatrixView />
            </div>
        </Box>
    );
};

// === Edit Component with Editable Header ===
const MatrixEditLayout = () => {
    const record = useRecordContext();
    const { register, control, setValue } = useFormContext(); // Provided by React Admin's Edit -> SimpleForm
    const theme = useTheme();

    if (!record || !record.header) return null;

    // We assume backend has already populated record.header
    // We will map over it and provide selects for day_type
    
    // Use controller to access the full header array field
    return (
        <Controller
            name="header"
            control={control}
            defaultValue={record.header}
            render={({ field: { value: header, onChange } }) => {
                if (!header) return <div>No header data</div>;
                
                const handleDayTypeChange = (index: number, newType: string) => {
                    const newHeader = [...header];
                    newHeader[index] = { ...newHeader[index], day_type: newType };
                    onChange(newHeader); // Update react-hook-form state
                };
                
                const isDark = theme.palette.mode === 'dark';
                const borderColor = isDark ? theme.palette.divider : 'black';
                const cellText = theme.palette.text.primary;
                
                return (
                    <Box sx={{ overflowX: 'auto', p: 2, background: isDark ? 'transparent' : 'white' }}>
                         <Typography variant="body1" sx={{ mb: 2 }}>
                            Редактиране на типовете дни. Промените ще се отразят след запис.
                        </Typography>
                        
                        <TableContainer component={Paper} sx={{ backgroundImage: 'none', backgroundColor: 'transparent' }}>
                            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, fontWeight: 'bold' }}>Дата</TableCell>
                                        {header.map((col: any, index: number) => {
                                            const dateObj = new Date(col.date);
                                            return (
                                                <TableCell key={`h-date-${index}`} align="center" sx={{ border: `1px solid ${borderColor}`, backgroundColor: getDayTypeColor(col.day_type, isDark), color: cellText }}>
                                                    {dateObj.getDate()}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, fontWeight: 'bold' }}>Ден</TableCell>
                                        {header.map((col: any, index: number) => (
                                            <TableCell key={`h-day-${index}`} align="center" sx={{ border: `1px solid ${borderColor}`, backgroundColor: getDayTypeColor(col.day_type, isDark), color: cellText }}>
                                                {col.day}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: `1px solid ${borderColor}`, fontWeight: 'bold' }}>Тип</TableCell>
                                        {header.map((col: any, index: number) => (
                                            <TableCell key={`h-type-${index}`} align="center" sx={{ border: `1px solid ${borderColor}`, minWidth: 60, padding: '4px' }}>
                                                <Select
                                                    value={col.day_type || 'Делник'}
                                                    onChange={(e) => handleDayTypeChange(index, e.target.value)}
                                                    variant="standard"
                                                    disableUnderline
                                                    sx={{ 
                                                        fontSize: '0.75rem', 
                                                        '& .MuiSelect-select': { paddingRight: '16px !important' }
                                                    }}
                                                >
                                                    {DAY_TYPES.map(dt => (
                                                        <MenuItem key={dt.value} value={dt.value} sx={{ fontSize: '0.75rem' }}>
                                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: isDark ? dt.darkColor : dt.color, display: 'inline-block', mr: 1 }} />
                                                            {dt.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                            </Table>
                        </TableContainer>
                    </Box>
                );
            }}
        />
    );
};

const MatrixToolbar = () => (
    <Toolbar>
        <SaveButton alwaysEnable />
    </Toolbar>
);

export const MatrixEdit = () => (
    <Edit>
        <SimpleForm toolbar={<MatrixToolbar />}>
            <ReferenceInput source="pattern" reference="order_patterns" label="Порядък">
                <SelectInput optionText="name" validate={required()} disabled />
            </ReferenceInput>
            <Box display="flex" gap={2}>
                 <NumberInput source="year" label="Година" validate={required()} disabled />
                 <NumberInput source="month" label="Месец" validate={required()} disabled />
            </Box>
            <NumberInput source="start_position" label="Начална позиция" validate={required()} />
            
            <MatrixEditLayout />
        </SimpleForm>
    </Edit>
);

export const MatrixShow = () => (
    <Show>
        <MatrixLayout />
    </Show>
);
