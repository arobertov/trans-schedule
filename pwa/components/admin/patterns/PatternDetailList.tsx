import { useMemo } from "react";
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
  useGetOne,
} from "react-admin";
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Box, Typography } from '@mui/material';

const ListActions = () => {
  return (
    <TopToolbar>
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
  const { data : listData, isLoading : listLoading, refetch } = useListContext();
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

  return (
    <Datagrid>
      <NumberField source="position_number" label="Позиция" />
      {columns.map((col: any) => (
        <FunctionField
          key={col.id}
          label={col.label || col.column_name}
          render={(record: any) => {
            if (!record || !record.values) return '';
            return record.values[col.column_name] || '';
          }}
        />
      ))}
      {columns.length === 0 && <TextField source="values" label="Стойности (JSON)" />}
    </Datagrid>
  );
};

export const PatternDetailList = () => (
  <List
    actions={<ListActions />}
    empty={<Empty />}
    pagination={false}
    sort={{ field: 'position_number', order: 'ASC' }}
  >
    <DetailListContent />
  </List>
);