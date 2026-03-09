import { useMemo } from "react";
import {
  Datagrid,
  NumberField,
  FunctionField,
  ReferenceManyField,
  useRecordContext,
  Button
} from "react-admin";
import { Box, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Link } from 'react-router-dom';

export const PatternDetailsManager = () => {
  const record = useRecordContext();

  // We need to fetch the pattern again or use record to get columns? 
  // record from useRecordContext in Show view should have the data if it was fetched.
  // But Show view might not have all relations or updated columns if they changed.
  // Using record.columns is usually safe if it comes from the API Resource.
  
  const columns = useMemo(() => {
    if (!record?.columns) return [];
    return [...record.columns].sort((a: any, b: any) => (a.column_number || 0) - (b.column_number || 0));
  }, [record]);

  if (!record) return null;

  return (
    <Box mt={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Детайли на порядъка</Typography>
        <Box display="flex" gap={2}>
            <Button
                component={Link}
                to={{
                  pathname: "/order_pattern_details/create",
                  search: `?pattern_id=${record.id}`, // Custom param to prefill pattern
                  state: { record: { pattern: record.id } } // React Admin convention for prefill?
                }}
                label="Добави ред"
                variant="contained"
            />
             <Button
                component={Link}
                to="/patterns/bulk-import"
                label="Масов импорт"
                startIcon={<UploadFileIcon />}
                variant="outlined"
            />
        </Box>
      </Box>

      <ReferenceManyField 
          key={record.id}
          reference="order_pattern_details" 
          target="pattern" 
          filter={{ pattern: record.id }} 
          sort={{ field: 'position_number', order: 'ASC' }}
          pagination={false}
      >
        <Datagrid>
          <NumberField source="position_number" label="Позиция" />
          {columns.map((col: any) => (
            <FunctionField
              key={col.id}
              label={col.label || col.column_name}
              render={(detailRecord: any) => {
                if (!detailRecord || !detailRecord.values) return '';
                return detailRecord.values[col.column_name] || '';
              }}
            />
          ))}
        </Datagrid>
      </ReferenceManyField>
    </Box>
  );
};
