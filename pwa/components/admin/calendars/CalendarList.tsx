import { Datagrid, List, NumberField, FunctionField } from 'react-admin';

export const CalendarList = () => (
    <List sort={{ field: 'year', order: 'DESC' }} title="Календари">
        <Datagrid rowClick="show">
            <NumberField source="year" label="Година" />
            <FunctionField 
                label="Общо работни дни" 
                render={(record: any) => {
                     if (!record.monthsData) return 0;
                     return Object.values(record.monthsData).reduce((sum: number, m: any) => sum + (m.workDays || 0), 0);
                }} 
            />
             <FunctionField 
                label="Общо работни часове" 
                render={(record: any) => {
                     if (!record.monthsData) return 0;
                     return Object.values(record.monthsData).reduce((sum: number, m: any) => sum + (m.workHours || 0), 0);
                }} 
            />
            <FunctionField 
                label="Статус" 
                render={(record: any) => record.monthsData && Object.keys(record.monthsData).length === 12 ? 'Готов' : 'Частичен'} 
            />
        </Datagrid>
    </List>
);
