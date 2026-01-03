import { useState, useEffect, createContext, useContext, useMemo } from "react";
import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  TopToolbar,
  CreateButton,
  Button,
  useListContext,
  Loading,
  useDataProvider,
  useGetOne,
} from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
//import { PatternDetailGrid } from './EditedPDGrid';
import { PatternDetailGrid } from './PatternDetailGrid';

// Create context for view mode
const ViewModeContext = createContext<{
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
}>({
  viewMode: 'grid',
  setViewMode: () => { },
});

const ListActions = () => {
  const { viewMode, setViewMode } = useContext(ViewModeContext);

  return (
    <TopToolbar>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(e, newMode) => {
          if (newMode) {
            setViewMode(newMode);
            sessionStorage.setItem('patternDetailViewMode', newMode);
          }
        }}
        size="small"
      >
        <ToggleButton value="grid">
          <ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} />
          Таблица
        </ToggleButton>
        <ToggleButton value="table">
          <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} />
          Списък
        </ToggleButton>
      </ToggleButtonGroup>
      <CreateButton />
      <Button
        component={Link}
        to="/patterns/bulk-import"
        label="Масов импорт"
        icon={<UploadFileIcon />}
      />
    </TopToolbar>
  );
};

const Empty = () => (
  <Box textAlign="center" m={4}>
    <Typography variant="h6" paragraph color="textSecondary">
      Няма създадени детайли на порядък
    </Typography>
    <Typography variant="body2" paragraph color="textSecondary">
      Можете да създадете детайл ръчно или да импортирате много редове наведнъж
    </Typography>
    <Box mt={2} display="flex" gap={2} justifyContent="center">
      <Button
        variant="contained"
        component={Link}
        to="/order_pattern_details/create"
        label="Създай детайл"
      />
      <Button
        variant="outlined"
        component={Link}
        to="/patterns/bulk-import"
        label="Масов импорт"
        icon={<UploadFileIcon />}
      />
    </Box>
  </Box>
);

const DetailListContent = () => {
  const { data : listData, isLoading : listLoading, refetch } = useListContext();
  const { viewMode } = useContext(ViewModeContext);
  const dataProvider = useDataProvider();
  const patternId = listData?.[0]?.pattern?.['@id'] || listData?.[0]?.pattern;
  const idOnly = typeof patternId === 'string' ? patternId : undefined;

  // Fetch pattern columns when data is available
  const { data: pattern, isLoading: patternLoading } = useGetOne(
    'order_patterns',
    { id: idOnly },
  )

  const columns = useMemo(() => {
    if (!pattern?.columns) return [];
    return [...pattern.columns].sort((a, b) => (a.column_number || 0) - (b.column_number || 0));
  }, [pattern]);

  if (listLoading || patternLoading) {
    return <Loading />; 
  }

  // If table mode, show simple list with dynamic columns
  if (viewMode === 'table') {
    return (
      <Datagrid>
        <NumberField source="position_number" label="Позиция" />
        {console.log('Rendering columns:', columns)}
        {columns.map((col: any) => (
          <FunctionField
            key={col.id}
            label={col.label}
            render={(record: any) => {
              if (!record || !record.values) return '';
              return record.values[col.column_name] || '';
            }}
          />
        ))}
      </Datagrid>
    );
  }

  // If grid mode and we have data, show the grid
  if (viewMode === 'grid' && listData && listData.length > 0) {
    if (patternId) {
      return <PatternDetailGrid patternId={patternId} onOrderChange={refetch} />;
    }
    return <Loading />;
  }

  // Fallback to simple datagrid
  return (
    <Datagrid>
      <NumberField source="position_number" label="Позиция" />
      <TextField source="values" label="Стойности (JSON)" />
    </Datagrid>
  );
};

export const PatternDetailList = () => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (sessionStorage.getItem('patternDetailViewMode') as 'table' | 'grid') || 'grid';
  });

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      <List
        actions={<ListActions />}
        empty={<Empty />}
        pagination={false}
        sort={{ field: 'position_number', order: 'ASC' }}
      >
        <DetailListContent />
      </List>
    </ViewModeContext.Provider>
  );
};