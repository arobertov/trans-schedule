import { useState, useEffect, createContext, useContext } from "react";
import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  EditButton,
  DeleteButton,
  TopToolbar,
  CreateButton,
  Button,
  useListContext,
  Loading,
} from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PatternDetailGrid } from './PatternDetailGrid';

// Create context for view mode
const ViewModeContext = createContext<{
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
}>({
  viewMode: 'grid',
  setViewMode: () => {},
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
        startIcon={<UploadFileIcon />}
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
        startIcon={<UploadFileIcon />}
      />
    </Box>
  </Box>
);

const DetailListContent = () => {
  const { data, isLoading } = useListContext();
  const { viewMode } = useContext(ViewModeContext);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    console.log('Trriger use efect. List data changed:', data);
    // Fetch pattern columns when data is available
    if (data && data.length > 0) {
      const firstItem = data[0];
      console.log('First item :', firstItem.originId);
      if (firstItem && firstItem.originId) {
        let patternId: string | undefined;
        if (typeof firstItem.originId === 'string') {
          patternId = firstItem.originId;
        } 
        
        if (patternId) {
          // Fetch pattern to get columns
          fetch(`${window.origin}/order_patterns/${patternId}`, {
            headers: {
              'Accept': 'application/ld+json',
            },
          })
            .then(res => res.json())
            .then(pattern => {
              if (pattern.columns) {
                setColumns(pattern.columns);
              }

              console.log('Fetched pattern columns:', pattern.columns);
            })
            .catch(err => console.error('Error fetching pattern columns:', err));
        }
      }
    }
  }, [data]);

  if (isLoading) {
    return <Loading />;
  }

  // If table mode, show simple list with dynamic columns
  if (viewMode === 'table') {
    return (
      <Datagrid>
        <NumberField source="position_number" label="Позиция" />
        <TextField source="pattern.name" label="Порядък" />
        {console.log('Rendering columns:', columns)}   
        {columns.map((col: any) => (
          <FunctionField 
            key={col.id}
            label={col.label}
            render={(record: any) => {
              if (!record || !record.values) return '-';
              return record.values[col.column_name] || '-';
            }}
          />
        ))}
        <EditButton />
        <DeleteButton />
      </Datagrid>
    );
  }

  // If grid mode and we have data, show the grid
  if (viewMode === 'grid' && data && data.length > 0) {
    const firstItem = data[0];
    if (firstItem && firstItem.pattern) {
      let patternId: string | undefined;
      
      if (typeof firstItem.pattern === 'string') {
        // If it's a string like "/order_patterns/1"
        patternId = firstItem.pattern.split('/').pop();
      } else if (firstItem.pattern['@id']) {
        // If it's an object with @id
        patternId = firstItem.pattern['@id'].split('/').pop();
      } else if (firstItem.pattern.id) {
        // If it's an object with id
        patternId = String(firstItem.pattern.id);
      }
      
      if (patternId) {
        return <PatternDetailGrid patternId={patternId} />;
      }
    }
  }

  // Fallback to simple datagrid
  return (
    <Datagrid>
      <NumberField source="position_number" label="Позиция" />
      <TextField source="pattern.name" label="Порядък" />
      <TextField source="values" label="Стойности (JSON)" />
      <EditButton />
      <DeleteButton />
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
      >
        <DetailListContent />
      </List>
    </ViewModeContext.Provider>
  );
};