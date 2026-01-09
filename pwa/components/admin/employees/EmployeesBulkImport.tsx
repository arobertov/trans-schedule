import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  LinearProgress,
  SelectChangeEvent
} from '@mui/material';
import { useDataProvider, useNotify, useRedirect } from 'react-admin';

interface EmployeeRow {
  full_name: string;
  phone: string;
  email: string;
}

interface Position {
  id: number;
  name: string;
}

export const EmployeesBulkImport = () => {
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<EmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  // Зареждане на позициите при монтиране на компонента
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const { data } = await dataProvider.getList('positions', {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: 'name', order: 'ASC' },
          filter: {},
        });
        setPositions(data);
      } catch (err: any) {
        notify('Грешка при зареждане на позициите', { type: 'error' });
        console.error('Error loading positions:', err);
      } finally {
        setLoadingPositions(false);
      }
    };

    fetchPositions();
  }, [dataProvider, notify]);

  const parseExcelData = (text: string) => {
    setError('');
    
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split('\n').filter(line => line.trim());
      const rows: EmployeeRow[] = [];

      lines.forEach((line, index) => {
        // Split by tab (Excel copy-paste delimiter)
        const columns = line.split('\t').map(col => col.trim());
        
        if (columns.length < 3) {
          throw new Error(`Ред ${index + 1}: Очаквам 3 колони (Име, Телефон, Имейл), намерени ${columns.length}.`);
        }

        rows.push({
          full_name: columns[0] || '',
          phone: columns[1] || '',
          email: columns[2] || '',
        });
      });

      setParsedRows(rows);
    } catch (err: any) {
      setError(err.message || 'Грешка при парсинг на данните');
      setParsedRows([]);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      notify('Няма данни за импорт', { type: 'warning' });
      return;
    }

    if (!selectedPosition) {
      notify('Моля изберете длъжност', { type: 'warning' });
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const position = positions.find(p => p.id.toString() === selectedPosition);
      if (!position) {
        notify('Избраната длъжност не е намерена', { type: 'error' });
        setIsLoading(false);
        return;
      }

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        try {
          // Валидация преди импорт
          if (!row.full_name || row.full_name.trim() === '') {
            throw new Error('Липсва пълно име');
          }

          // Разделяне на пълното име на части
          const nameParts = row.full_name.trim().split(/\s+/);
          const first_name = nameParts[0] || '';
          const middle_name = nameParts.length > 2 ? nameParts[1] : '';
          const last_name = nameParts.length > 2 ? nameParts.slice(2).join(' ') : (nameParts[1] || '');

          // Client-side validation to avoid API 422 crashes
          if (row.phone) {
             const phoneRegex = /^(?:\+359|0)8[789]\d{7}$/;
             if (!phoneRegex.test(row.phone.replace(/\s+/g, ''))) {
                  throw new Error(`Невалиден телефонен номер: ${row.phone}`);
             }
          }

          if (row.email) {
             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
             if (!emailRegex.test(row.email.trim())) {
                  throw new Error(`Невалиден имейл: ${row.email}`);
             }
          }

          await dataProvider.create('employees', {
            data: {
              first_name: first_name,
              middle_name: middle_name,
              last_name: last_name,
              phone: row.phone || '',
              email: row.email || '',
              position: `${position.id}`,
              notes: '',
              status: 'активен', // Статус активен по подразбиране
            }
          });
          successCount++;
          
          // Обновяване на прогреса
          setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        } catch (err: any) {
          // Flatten error for logging to prevent Next.js overlay crashes with complex objects
          const cleanMessage = err?.message || 'Unknown error';
          console.error(`Import error row ${i + 1}: ${cleanMessage}`);
          
          let errorMsg = 'Неизвестна грешка';
          
          // Try to extract a meaningful error message from various API Platform/Hydra formats
          try {
              let extractedMsg = '';

              if (typeof err === 'string') {
                  extractedMsg = err;
              } 
              // Handle Expanded JSON-LD (Array format) seen in some 422 responses
              else if (Array.isArray(err?.body) && err.body.length > 0) {
                  const errorObj = err.body[0];
                  // Find keys ending with description or violations (ignoring full URI prefix)
                  const keys = Object.keys(errorObj);
                  const descKey = keys.find(k => k.includes('description'));
                  const violationsKey = keys.find(k => k.includes('violations'));

                  if (descKey && Array.isArray(errorObj[descKey]) && errorObj[descKey].length > 0) {
                      extractedMsg = errorObj[descKey][0]['@value'] || errorObj[descKey][0];
                  } else if (violationsKey && Array.isArray(errorObj[violationsKey])) {
                      const violations = errorObj[violationsKey];
                      const messages = violations.map((v: any) => {
                          const vKeys = Object.keys(v);
                          const msgKey = vKeys.find(k => k.includes('message'));
                          const pathKey = vKeys.find(k => k.includes('propertyPath'));
                          
                          const msg = msgKey && v[msgKey]?.[0]?.['@value'] ? v[msgKey][0]['@value'] : '';
                          const path = pathKey && v[pathKey]?.[0]?.['@value'] ? v[pathKey][0]['@value'] : '';
                          
                          return path ? `${path}: ${msg}` : msg;
                      }).filter((m: string) => m);
                      extractedMsg = messages.join('; ');
                  }
              }
              // Handle Standard Hydra (Compact JSON-LD)
              else if (err?.body?.['hydra:description']) {
                  extractedMsg = String(err.body['hydra:description']);
              } 
              // Handle Standard Violations Array
              else if (err?.body?.violations && Array.isArray(err.body.violations)) {
                   extractedMsg = err.body.violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join('; ');
              }
              // Fallback to generic message properties
              else if (err?.message) {
                  extractedMsg = String(err.message);
              } 
              else if (err?.body?.message) {
                  extractedMsg = String(err.body.message);
              }

              if (extractedMsg) {
                  errorMsg = extractedMsg;
                  console.log('Extracted error message:', errorMsg);
              }
          } catch (e) {
              console.error('Error parsing exception deeply:', e);
              errorMsg = "Error parsing validation response";
          }
          
          // Filter out phone number validation errors from the display list
          // But still count them as failures
          const lowerMsg = (errorMsg || '').toLowerCase();
          const isPhoneError = lowerMsg.includes('phone') || 
                               lowerMsg.includes('телефон') ||
                               lowerMsg.includes('number');

          if (!isPhoneError) {
             errors.push(`Ред ${i + 1} (${row.full_name}): ${errorMsg}`);
          }
          
          failCount++;
          
          // Обновяване на прогреса дори при грешка
          setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        }
      }

      if (successCount > 0) {
        notify(`Успешно импортирани ${successCount} служители`, { type: 'success' });
      }
      
      if (failCount > 0) {
        let errorReport = '';
        if (errors.length > 0) {
             const errorText = errors.slice(0, 5).join('\n');
             errorReport = `${failCount} служители не бяха импортирани:\n${errorText}${errors.length > 5 ? '\n...' : ''}`;
        } else {
             // If errors were suppressed (like only phone errors), show generic message
             errorReport = `${failCount} служители не бяха импортирани поради валидационни грешки (напр. невалиден телефон).`;
        }
        
        setError(errorReport);
        notify(`${failCount} служители не бяха импортирани`, { type: 'warning' });
      }

      if (successCount === parsedRows.length) {
        setTimeout(() => {
          redirect('/employees');
        }, 1000);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Грешка при импорт';
      setError(errorMsg);
      notify(errorMsg, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingPositions) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Зареждане на позиции...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Масов импорт на служители от Excel
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Първо изберете длъжност, след което копирайте редовете от Excel таблица. Статусът ще бъде автоматично "активен".
          <br />
          <strong>Колони (в този ред):</strong> Пълно име (Име Презиме Фамилия) | Телефон | Имейл
          <br />
          <strong>Пример:</strong> Иван Петров Иванов	0888123456	ivan@example.com
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Длъжност</InputLabel>
              <Select
                value={selectedPosition}
                label="Длъжност"
                onChange={(e: SelectChangeEvent) => setSelectedPosition(e.target.value)}
                disabled={loadingPositions || positions.length === 0}
              >
                {positions.map((position) => (
                  <MenuItem key={position.id} value={position.id.toString()}>
                    {position.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {positions.length === 0 && !loadingPositions && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Няма налични позиции. Моля, първо създайте позиции преди да импортирате служители.
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={10}
          variant="outlined"
          label="Поставете данни от Excel"
          placeholder="Копирайте редове от Excel и ги поставете тук..."
          value={pastedData}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPastedData(e.target.value);
            parseExcelData(e.target.value);
          }}
          sx={{ mb: 2 }}
          disabled={isLoading || positions.length === 0}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}

        {parsedRows.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Преглед на данните ({parsedRows.length} служители)
            </Typography>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Пълно име</TableCell>
                    <TableCell>Телефон</TableCell>
                    <TableCell>Имейл</TableCell>
                    <TableCell>Длъжност</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.map((row, index) => {
                    const selectedPos = positions.find(p => p.id.toString() === selectedPosition);
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          {selectedPos?.name || '-'}
                        </TableCell>
                        <TableCell>активен</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {isLoading && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Импортиране... {progress}%
                </Typography>
              </Box>
            )}

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleImport}
                disabled={isLoading || parsedRows.length === 0}
              >
                {isLoading ? <CircularProgress size={24} /> : `Импортирай ${parsedRows.length} служители`}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setPastedData('');
                  setParsedRows([]);
                  setError('');
                }}
                disabled={isLoading}
              >
                Изчисти
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};
