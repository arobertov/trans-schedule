import { Show, SimpleShowLayout, useRecordContext, TopToolbar, DeleteButton, EditButton } from 'react-admin';
import { Box, Typography, Paper, Grid } from '@mui/material';

const MonthGrid = ({ year, month, data }: { year: number, month: number, data: any }) => {
    if (!data) return null;
    
    // First Day logic (JS Date: 0=Sun, 1=Mon)
    // We want Mon=0 ... Sun=6
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); 
    const offset = (firstDayIndex + 6) % 7;
    
    const blanks = Array.from({ length: offset });
    const days = data.days || [];
    const sortedDays = [...days].sort((a: any, b: any) => a.day - b.day);
    
    const dateObj = new Date(year, month - 1, 1);
    const monthName = dateObj.toLocaleString('bg-BG', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <Paper sx={{ p: 1, minHeight: 250, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
             <Box bgcolor="#e3f2fd" p={0.5} textAlign="center" borderRadius="4px 4px 0 0" mb={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                    {capitalizedMonth}
                </Typography>
             </Box>
             
             <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0} mb={0.5}>
                {['П', 'В', 'С', 'Ч', 'П', 'С', 'Н'].map((d, i) => (
                    <Box key={i} textAlign="center" fontSize="0.7rem" color="text.secondary">
                        {d}
                    </Box>
                ))}
            </Box>
            
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0} flex={1}>
                {blanks.map((_, i) => <Box key={`blank-${i}`} />)}
                {sortedDays.map((d: any) => {
                    const isHoliday = d.type === 'holiday';
                    const isWeekend = d.type === 'weekend';
                    const color = isWeekend ? 'text.disabled' : 'text.primary';
                    
                    return (
                        <Box 
                            key={d.day} 
                            textAlign="center" 
                            fontSize="0.8rem"
                            p={0.2}
                            position="relative"
                            sx={{
                                color,
                                fontWeight: (isHoliday) ? 'bold' : 'normal',
                                bgcolor: isHoliday ? '#fff3e0' : 'transparent',
                                cursor: d.note ? 'help' : 'default',
                            }}
                            title={d.note}
                        >
                            {d.day}
                        </Box>
                    );
                })}
             </Box>
             
             <Box mt={1} pt={1} borderTop="1px solid #eee">
                <Typography variant="caption" display="block" align="center" color="primary">
                    {data.workDays} дни / {data.workHours} ч.
                </Typography>
             </Box>
        </Paper>
    );
};

const CalendarYearView = () => {
    const record = useRecordContext();
    if (!record || !record.year || !record.monthsData) return null;
    
    const year = record.year;
    
    return (
        <Box p={2}>
            <Box 
                mb={3} 
                p={2} 
                bgcolor="#e3f2fd" 
                borderRadius={2} 
                border="1px solid #90caf9"
                display="flex" 
                justifyContent="center"
                alignItems="center"
            >
                <Typography variant="h4" fontWeight="bold" color="#1565c0">
                    Работен календар за {year} година
                </Typography>
            </Box>
            <Grid container spacing={2}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={m}>
                        <MonthGrid year={year} month={m} data={record.monthsData[m]} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const CalendarActions = () => (
    <TopToolbar>
        <DeleteButton />
    </TopToolbar>
);

export const CalendarShow = () => (
    <Show actions={<CalendarActions />} title="Преглед на Годишен Календар" sx={{ '& .RaShow-main': { maxWidth: '100%' } }}>
        <SimpleShowLayout sx={{ maxWidth: '100%' }}>
             <CalendarYearView />
        </SimpleShowLayout>
    </Show>
);
