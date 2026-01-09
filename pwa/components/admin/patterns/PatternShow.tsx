import {
  Show,
  Datagrid,
  ArrayField,
  NumberField,
  TextField,
  useRecordContext,
} from "react-admin";
import { Box, Typography, useTheme, Chip } from "@mui/material";
import { PatternDetailsManager } from "./PatternDetailsManager";

const PatternLayout = () => {
  const record = useRecordContext();
  const theme = useTheme();

  if (!record) return null;

  const isDark = theme.palette.mode === 'dark';
  const infoBoxBg = isDark ? theme.palette.grey[900] : '#f9f9f9';
  const infoBoxBorder = isDark ? theme.palette.grey[800] : '#eee';

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Info - Inline */}
      <Box sx={{ 
        display: 'flex', 
        gap: 4, 
        mb: 3, 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        backgroundColor: infoBoxBg, 
        p: 2, 
        borderRadius: 1, 
        border: `1px solid ${infoBoxBorder}` 
      }}>
        {/* Наименование */}
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            Наименование
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {record.name}
          </Typography>
        </Box>

        {/* Статус */}
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            Статус
          </Typography>
          <Chip 
            label={record.is_active ? "Активен" : "Неактивен"} 
            color={record.is_active ? "success" : "default"}
            size="small"
            variant={record.is_active ? "filled" : "outlined"}
          />
        </Box>

        {/* Брой позиции */}
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            Брой позиции
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {record.total_positions}
          </Typography>
        </Box>

        {/* Описание */}
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            Описание
          </Typography>
          <Typography sx={{ fontSize: '1rem' }}>
            {record.description || '-'}
          </Typography>
        </Box>
      </Box>

      {/* Columns */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Колони</Typography>
        <ArrayField source="columns">
          <Datagrid bulkActionButtons={false} sx={{ 
            '& .RaDatagrid-headerCell': { fontWeight: 'bold', backgroundColor: isDark ? '#333' : '#f5f5f5' }
          }}>
            <NumberField source="column_number" label="№" />
            <TextField source="column_name" label="Име" />
            <TextField source="label" label="Етикет" />
            <TextField source="description" label="Описание" />
          </Datagrid>
        </ArrayField>
      </Box>
      
      <PatternDetailsManager />
    </Box>
  );
};

export const PatternShow = () => (
  <Show>
    <PatternLayout />
  </Show>
);