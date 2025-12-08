import React, { useState } from 'react';
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
  LinearProgress
} from '@mui/material';
import { useDataProvider, useNotify, useRedirect } from 'react-admin';

interface ShiftRow {
  shift_code: string;
  worked_time: string;
  night_work: string;
  kilometers: string;
  zero_time: string;
}

export const ShiftsBulkImport = () => {
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<ShiftRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dayType, setDayType] = useState<string>('Делник');
  const [season, setSeason] = useState<string>('Летен');
  const [progress, setProgress] = useState(0);
  
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const parseExcelData = (text: string) => {
    setError('');
    
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split('\n').filter(line => line.trim());
      const rows: ShiftRow[] = [];

      lines.forEach((line, index) => {
        // Split by tab (Excel copy-paste delimiter)
        const columns = line.split('\t').map(col => col.trim());
        
        if (columns.length < 5) {
          throw new Error(`Ред ${index + 1}: Очаквам 5 колони, намерени ${columns.length}. Уверете се, че копирате всички колони от Excel.`);
        }

        rows.push({
          shift_code: columns[0] || '',
          worked_time: columns[1] || '00:00',
          night_work: columns[2] || '00:00',
          kilometers: columns[3] || '0.00',
          zero_time: columns[4] || '00:00',
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

    if (!dayType || !season) {
      notify('Моля изберете тип ден и сезон', { type: 'warning' });
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        try {
          // Валидация преди импорт
          if (!row.shift_code || row.shift_code.trim() === '') {
            throw new Error('Липсва код на смяна');
          }

          const km = parseFloat(row.kilometers);
          if (isNaN(km)) {
            throw new Error('Невалидни километри');
          }

          await dataProvider.create('shift_schedules', {
            data: {
              shift_code: row.shift_code,
              day_type: dayType,
              season: season,
              worked_time: row.worked_time,
              night_work: row.night_work || '00:00',
              kilometers: km,
              zero_time: row.zero_time || '00:00',
            }
          });
          successCount++;
          
          // Обновяване на прогреса
          setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        } catch (err: any) {
          console.error(`Грешка при импорт на ред ${i + 1} (${row.shift_code}):`, err);
          const errorMsg = err?.body?.['hydra:description'] || err?.message || 'Неизвестна грешка';
          errors.push(`Ред ${i + 1} (${row.shift_code}): ${errorMsg}`);
          failCount++;
          
          // Обновяване на прогреса дори при грешка
          setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        }
      }

      if (successCount > 0) {
        notify(`Успешно импортирани ${successCount} записа`, { type: 'success' });
      }
      
      if (failCount > 0) {
        const errorText = errors.slice(0, 5).join('\n');
        setError(`${failCount} записа не бяха импортирани:\n${errorText}${errors.length > 5 ? '\n...' : ''}`);
        notify(`${failCount} записа не бяха импортирани`, { type: 'warning' });
      }

      if (successCount === parsedRows.length) {
        setTimeout(() => {
          redirect('/shift_schedules');
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Масов импорт на смени от Excel
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Изберете тип ден и сезон, след което копирайте редовете от Excel таблица.
          <br />
          <strong>Колони (в този ред):</strong> Код на смяна | Отработено време | Нощен труд | Километри | Нулево време
          <br />
          <strong>Пример:</strong> СМ1-Л	08:00	00:00	0.00	00:00
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Тип ден</InputLabel>
              <Select
                value={dayType}
                label="Тип ден"
                onChange={(e) => setDayType(e.target.value)}
              >
                <MenuItem value="Делник">Делник</MenuItem>
                <MenuItem value="Празник">Празник</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Сезон</InputLabel>
              <Select
                value={season}
                label="Сезон"
                onChange={(e) => setSeason(e.target.value)}
              >
                <MenuItem value="Летен">Летен</MenuItem>
                <MenuItem value="Зимен">Зимен</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TextField
          multiline
          fullWidth
          rows={10}
          variant="outlined"
          placeholder="Поставете данните от Excel тук..."
          value={pastedData}
          onChange={(e) => {
            setPastedData(e.target.value);
            parseExcelData(e.target.value);
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {error}
          </Alert>
        )}

        {parsedRows.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Преглед ({parsedRows.length} реда) - {dayType}, {season}
            </Typography>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Код</TableCell>
                    <TableCell>Отработено</TableCell>
                    <TableCell>Нощен труд</TableCell>
                    <TableCell>Km</TableCell>
                    <TableCell>Нулево</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.shift_code}</TableCell>
                      <TableCell>{row.worked_time}</TableCell>
                      <TableCell>{row.night_work}</TableCell>
                      <TableCell>{row.kilometers}</TableCell>
                      <TableCell>{row.zero_time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {isLoading && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">
                      {progress}%
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', ml: 1 }}>
                    <LinearProgress variant="determinate" value={progress} />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Импортирани {Math.round((progress / 100) * parsedRows.length)} от {parsedRows.length} записа...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleImport}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Импортиране...' : `Импортирай ${parsedRows.length} записа`}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setPastedData('');
                  setParsedRows([]);
                  setError('');
                  setProgress(0);
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
