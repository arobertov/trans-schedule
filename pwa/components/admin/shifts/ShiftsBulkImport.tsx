import React, { useEffect, useState } from 'react';
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

interface ShiftRow {
  row_number: string;
  shift_code: string;
  at_doctor: string;
  at_duty_officer: string;
  route: string;
  pickup_location: string;
  pickup_route_number: string;
  in_schedule: string;
  from_schedule: string;
  dropoff_location: string;
  dropoff_route_number: string;
  shift_end: string;
  worked_time: string;
  kilometers: string;
  zero_time: string;
}

interface ShiftRoute {
  route?: string | null;
  route_kilometers?: number | null;
  pickup_location?: string | null;
  pickup_route_number?: string | null;
  in_schedule?: string | null;
  from_schedule?: string | null;
  dropoff_location?: string | null;
  dropoff_route_number?: string | null;
}

interface ParsedShift {
  shift_code: string;
  at_doctor: string;
  at_duty_officer: string;
  shift_end: string;
  worked_time: string;
  kilometers: number;
  has_total_kilometers_value: boolean;
  zero_time: string;
  routes: ShiftRoute[];
}

interface ShiftScheduleOption {
  id?: string | number;
  '@id'?: string;
  iri: string;
  name: string;
}

export const ShiftsBulkImport = () => {
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<ShiftRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftScheduleOption[]>([]);
  const [loadingShiftSchedules, setLoadingShiftSchedules] = useState(true);
  const [selectedShiftSchedule, setSelectedShiftSchedule] = useState<string>('');
  const [scheduleMode, setScheduleMode] = useState<'existing' | 'new'>('existing');
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleDescription, setNewScheduleDescription] = useState('');
  
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const toResourceIri = (value: unknown, resourceName: string): string => {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }

      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          return new URL(trimmed).pathname;
        } catch {
          return trimmed;
        }
      }

      if (trimmed.startsWith('/')) {
        return trimmed;
      }

      return `/${resourceName}/${trimmed}`;
    }

    if (typeof value === 'number') {
      return `/${resourceName}/${value}`;
    }

    if (typeof value === 'object') {
      const record = value as { '@id'?: unknown; id?: unknown };

      if (typeof record['@id'] === 'string') {
        return toResourceIri(record['@id'], resourceName);
      }

      if (record.id !== undefined && record.id !== null) {
        return toResourceIri(record.id, resourceName);
      }
    }

    return '';
  };

  const getApiErrorMessage = (error: any): string => {
    const body = error?.body;

    return body?.detail
      || body?.['hydra:description']
      || body?.message
      || error?.message
      || 'Неизвестна грешка';
  };

  useEffect(() => {
    const loadShiftSchedules = async () => {
      try {
        const { data } = await dataProvider.getList('shift_schedules', {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: 'name', order: 'ASC' },
          filter: {},
        });

        const normalizedSchedules = (Array.isArray(data) ? data : [])
          .map((schedule: any) => ({
            ...schedule,
            iri: toResourceIri(schedule, 'shift_schedules'),
          }))
          .filter((schedule): schedule is ShiftScheduleOption => Boolean(schedule?.iri) && typeof schedule?.name === 'string');

        setShiftSchedules(normalizedSchedules);
      } catch (err: any) {
        notify('Грешка при зареждане на графиците за смени', { type: 'error' });
      } finally {
        setLoadingShiftSchedules(false);
      }
    };

    loadShiftSchedules();
  }, [dataProvider, notify]);

  const normalizeTime = (value: string, fallback = '00:00'): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return fallback;
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return fallback;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return fallback;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const normalizeZeroTime = (value: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return '0:00';
    }

    const match = trimmed.match(/^(-?)(\d{1,2}):(\d{2})$/);
    if (!match) {
      return '0:00';
    }

    const sign = match[1] || '';
    const hours = Number(match[2]);
    const minutes = Number(match[3]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) {
      return '0:00';
    }

    return `${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const parseKilometers = (value: string): number => {
    const normalized = (value || '').trim().replace(',', '.');
    if (!normalized) {
      return 0;
    }

    const km = Number.parseFloat(normalized);
    if (Number.isNaN(km)) {
      return 0;
    }

    return Math.round(km * 100) / 100;
  };

  const parseOptionalKilometers = (value: string): number | undefined => {
    const normalized = (value || '').trim().replace(',', '.');
    if (!normalized) {
      return undefined;
    }

    const km = Number.parseFloat(normalized);
    if (Number.isNaN(km)) {
      return undefined;
    }

    return Math.round(km * 100) / 100;
  };

  const toOptionalString = (value: string): string | undefined => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return undefined;
    }

    return trimmed;
  };

  const normalizeOptionalText = (value: string): string | null => {
    const trimmed = (value || '').trim();
    return trimmed ? trimmed : null;
  };

  const normalizeRoutePayload = (routes: ShiftRoute[]): ShiftRoute[] => {
    return routes
      .map((route) => ({
        route: route.route ?? null,
        route_kilometers: typeof route.route_kilometers === 'number' ? route.route_kilometers : null,
        pickup_location: route.pickup_location?.trim() || null,
        pickup_route_number: route.pickup_route_number ?? null,
        in_schedule: route.in_schedule || null,
        from_schedule: route.from_schedule || null,
        dropoff_location: route.dropoff_location?.trim() || null,
        dropoff_route_number: route.dropoff_route_number ?? null,
      }))
      .filter((route) => Object.values(route).some((value) => value !== null));
  };

  const parseToShiftModels = (rows: ShiftRow[]): ParsedShift[] => {
    const shifts: ParsedShift[] = [];
    let currentShift: ParsedShift | null = null;

    rows.forEach((row, idx) => {
      const shiftCode = row.shift_code.trim();
      const hasNewShift = shiftCode !== '';

      if (hasNewShift) {
        currentShift = {
          shift_code: shiftCode,
          at_doctor: normalizeTime(row.at_doctor, '08:00'),
          at_duty_officer: normalizeTime(row.at_duty_officer, '12:00'),
          shift_end: normalizeTime(row.shift_end, '16:00'),
          worked_time: normalizeTime(row.worked_time, '08:00'),
          kilometers: parseKilometers(row.kilometers),
          has_total_kilometers_value: row.kilometers.trim() !== '',
          zero_time: normalizeZeroTime(row.zero_time),
          routes: [],
        };

        shifts.push(currentShift);
      } else if (!currentShift) {
        throw new Error(`Ред ${idx + 1}: Липсва код на смяна за първия ред от групата.`);
      }

      if (!currentShift) {
        return;
      }

      if (!hasNewShift) {
        if (row.at_doctor.trim()) {
          currentShift.at_doctor = normalizeTime(row.at_doctor, currentShift.at_doctor);
        }
        if (row.at_duty_officer.trim()) {
          currentShift.at_duty_officer = normalizeTime(row.at_duty_officer, currentShift.at_duty_officer);
        }
        if (row.shift_end.trim()) {
          currentShift.shift_end = normalizeTime(row.shift_end, currentShift.shift_end);
        }
        if (row.worked_time.trim()) {
          currentShift.worked_time = normalizeTime(row.worked_time, currentShift.worked_time);
        }
        if (row.zero_time.trim()) {
          currentShift.zero_time = normalizeZeroTime(row.zero_time);
        }
      }

      const hasRouteData = [
        row.route,
        row.pickup_location,
        row.pickup_route_number,
        row.in_schedule,
        row.from_schedule,
        row.dropoff_location,
        row.dropoff_route_number,
      ].some((value) => value.trim() !== '');

      if (hasRouteData) {
        const routeKilometers = hasNewShift ? undefined : parseOptionalKilometers(row.kilometers);

        const routeModel: ShiftRoute = {
          route: toOptionalString(row.route) ?? null,
          route_kilometers: routeKilometers ?? null,
          pickup_location: normalizeOptionalText(row.pickup_location),
          pickup_route_number: toOptionalString(row.pickup_route_number) ?? null,
          in_schedule: row.in_schedule.trim() ? normalizeTime(row.in_schedule) : null,
          from_schedule: row.from_schedule.trim() ? normalizeTime(row.from_schedule) : null,
          dropoff_location: normalizeOptionalText(row.dropoff_location),
          dropoff_route_number: toOptionalString(row.dropoff_route_number) ?? null,
        };

        currentShift.routes.push(routeModel);
      }
    });

    return shifts;
  };

  const getParsedShiftCount = (): number => {
    try {
      return parseToShiftModels(parsedRows).length;
    } catch {
      return 0;
    }
  };

  const getPreImportWarnings = (): string[] => {
    try {
      const shiftModels = parseToShiftModels(parsedRows);
      const warnings: string[] = [];

      shiftModels.forEach((shift) => {
        const hasRouteKilometers = shift.routes.some((route) => typeof route.route_kilometers === 'number');
        if (hasRouteKilometers && !shift.has_total_kilometers_value) {
          warnings.push(`Смяна ${shift.shift_code}: има километри по маршрути, но липсват общи километри в първия ред.`);
        }
      });

      return warnings;
    } catch (err: any) {
      return [err?.message || 'Невалидна структура на данните за импорт.'];
    }
  };

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
        const columns = line.split('\t').map(col => col.trim());

        if (
          (columns[0] || '').toLowerCase() === '№'
          || (columns[1] || '').toLowerCase().includes('смяна')
        ) {
          return;
        }

        const normalizedColumns = [...columns];
        while (normalizedColumns.length < 15) {
          normalizedColumns.push('');
        }
        
        if (normalizedColumns.length < 15) {
          throw new Error(`Ред ${index + 1}: Очаквам 15 колони, намерени ${columns.length}.`);
        }

        rows.push({
          row_number: normalizedColumns[0] || '',
          shift_code: normalizedColumns[1] || '',
          at_doctor: normalizedColumns[2] || '',
          at_duty_officer: normalizedColumns[3] || '',
          route: normalizedColumns[4] || '',
          pickup_location: normalizedColumns[5] || '',
          pickup_route_number: normalizedColumns[6] || '',
          in_schedule: normalizedColumns[7] || '',
          from_schedule: normalizedColumns[8] || '',
          dropoff_location: normalizedColumns[9] || '',
          dropoff_route_number: normalizedColumns[10] || '',
          shift_end: normalizedColumns[11] || '',
          worked_time: normalizedColumns[12] || '',
          kilometers: normalizedColumns[13] || '',
          zero_time: normalizedColumns[14] || '',
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

    if (scheduleMode === 'existing' && !selectedShiftSchedule) {
      notify('Моля изберете график за смените', { type: 'warning' });
      return;
    }

    if (scheduleMode === 'new' && !newScheduleName.trim()) {
      notify('Моля въведете име на нов график за смените', { type: 'warning' });
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      const shiftModels = parseToShiftModels(parsedRows);

      if (shiftModels.length === 0) {
        notify('Няма валидни смени за импорт', { type: 'warning' });
        setIsLoading(false);
        return;
      }

      const validationIssues = shiftModels
        .filter((shift) => {
          const hasRouteKilometers = shift.routes.some((route) => typeof route.route_kilometers === 'number');
          return hasRouteKilometers && !shift.has_total_kilometers_value;
        })
        .map((shift) => `Смяна ${shift.shift_code}: има километри по маршрути, но липсват общи километри в първия ред.`);

      if (validationIssues.length > 0) {
        const msg = `Импортът е спрян заради валидационни проблеми:\n${validationIssues.slice(0, 6).join('\n')}${validationIssues.length > 6 ? '\n...' : ''}`;
        setError(msg);
        notify('Импортът е спрян: липсват общи километри при налични маршрутни километри', { type: 'warning' });
        setIsLoading(false);
        return;
      }

      let targetScheduleIri = selectedShiftSchedule;
      if (scheduleMode === 'new') {
        const createdSchedule = await dataProvider.create('shift_schedules', {
          data: {
            name: newScheduleName.trim(),
            description: newScheduleDescription.trim() || null,
          },
        });

        const createdData = createdSchedule?.data || {};
        targetScheduleIri = toResourceIri(createdData, 'shift_schedules');

        if (!targetScheduleIri) {
          throw new Error('Неуспешно създаване на график за смени');
        }
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < shiftModels.length; i++) {
        const row = shiftModels[i];
        try {
          if (!row.shift_code) {
            errors.push(`Ред ${i + 1}: Липсва код на смяна`);
            failCount++;
            setProgress(Math.round(((i + 1) / shiftModels.length) * 100));
            continue;
          }

          await dataProvider.create('shift_schedule_details', {
            data: {
              shift_schedule: targetScheduleIri,
              shift_code: row.shift_code,
              at_doctor: row.at_doctor,
              at_duty_officer: row.at_duty_officer,
              shift_end: row.shift_end,
              worked_time: row.worked_time,
              night_work: '00:00',
              kilometers: row.kilometers,
              zero_time: row.zero_time || '0:00',
              routes: normalizeRoutePayload(row.routes),
            }
          });
          successCount++;
          
          setProgress(Math.round(((i + 1) / shiftModels.length) * 100));
        } catch (err: any) {
          console.error(`Грешка при импорт на ред ${i + 1} (${row.shift_code}):`, err);
          const errorMsg = getApiErrorMessage(err);
          errors.push(`Ред ${i + 1} (${row.shift_code}): ${errorMsg}`);
          failCount++;
          
          setProgress(Math.round(((i + 1) / shiftModels.length) * 100));
        }
      }

      if (successCount > 0) {
        notify(`Успешно импортирани ${successCount} смени`, { type: 'success' });
      }
      
      if (failCount > 0) {
        const errorText = errors.slice(0, 5).join('\n');
        setError(`${failCount} смени не бяха импортирани:\n${errorText}${errors.length > 5 ? '\n...' : ''}`);
        notify(`${failCount} смени не бяха импортирани`, { type: 'warning' });
      }

      if (successCount === shiftModels.length) {
        setTimeout(() => {
          redirect('/shift_schedule_details');
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

  if (loadingShiftSchedules) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Зареждане на графици за смени...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const preImportWarnings = getPreImportWarnings();

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Масов импорт на смени от Excel
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Поддържа се сложен Excel импорт с 15 колони и вложени маршрути (няколко реда към една смяна).
          <br />
          Първо изберете съществуващ график или създайте нов, след което поставете данните от Excel.
          <br />
          <strong>Колони (в този ред):</strong> № | Смяна | При лекар | При деж. | Маршрут | Място (качване) | Път № | В график | От график | Място (слизане) | Път № | Край | Раб. вр. | Км. | Нул. време
          <br />
          <strong>Бележка:</strong> Редове без стойност в "Смяна" се приемат като продължение на предишната смяна (вложени маршрути).
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="schedule-mode-label">Режим</InputLabel>
              <Select
                labelId="schedule-mode-label"
                label="Режим"
                value={scheduleMode}
                onChange={(e: SelectChangeEvent<'existing' | 'new'>) => setScheduleMode(e.target.value as 'existing' | 'new')}
                disabled={isLoading}
              >
                <MenuItem value="existing">Избор на съществуващ график</MenuItem>
                <MenuItem value="new">Създаване на нов график</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            {scheduleMode === 'existing' ? (
              <FormControl fullWidth required>
                <InputLabel id="shift-schedule-label">График за смените</InputLabel>
                <Select
                  labelId="shift-schedule-label"
                  label="График за смените"
                  value={selectedShiftSchedule}
                  onChange={(e: SelectChangeEvent<string>) => setSelectedShiftSchedule(e.target.value)}
                  disabled={isLoading || shiftSchedules.length === 0}
                >
                  {shiftSchedules.map((schedule: ShiftScheduleOption) => (
                    <MenuItem key={schedule.iri} value={schedule.iri}>
                      {schedule.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                required
                label="Име на нов график"
                value={newScheduleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewScheduleName(e.target.value)}
                disabled={isLoading}
              />
            )}
          </Grid>

          {scheduleMode === 'new' && (
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Описание на новия график"
                value={newScheduleDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewScheduleDescription(e.target.value)}
                disabled={isLoading}
              />
            </Grid>
          )}
        </Grid>

        {scheduleMode === 'existing' && shiftSchedules.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Няма налични графици за смени. Изберете режим "Създаване на нов график" или създайте график предварително.
          </Alert>
        )}

        <TextField
          multiline
          fullWidth
          rows={10}
          variant="outlined"
          placeholder="Поставете данните от Excel тук..."
          value={pastedData}
          disabled={isLoading || (scheduleMode === 'existing' && !selectedShiftSchedule) || (scheduleMode === 'new' && !newScheduleName.trim())}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            {preImportWarnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Открити са проблеми преди импорт:
                </Typography>
                {preImportWarnings.slice(0, 6).map((warning, idx) => (
                  <Typography key={idx} variant="body2">
                    • {warning}
                  </Typography>
                ))}
                {preImportWarnings.length > 6 && (
                  <Typography variant="body2">• ...</Typography>
                )}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Преглед ({parsedRows.length} реда)
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Разпознати смени: {getParsedShiftCount()}
            </Typography>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>№</TableCell>
                    <TableCell>Код</TableCell>
                    <TableCell>При лекар</TableCell>
                    <TableCell>При дежурен</TableCell>
                    <TableCell>Маршрут</TableCell>
                    <TableCell>Качване</TableCell>
                    <TableCell>Път № (к)</TableCell>
                    <TableCell>В график</TableCell>
                    <TableCell>От график</TableCell>
                    <TableCell>Слизане</TableCell>
                    <TableCell>Път № (с)</TableCell>
                    <TableCell>Край</TableCell>
                    <TableCell>Отработено</TableCell>
                    <TableCell>Km</TableCell>
                    <TableCell>Нулево</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.map((row: ShiftRow, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell>{row.shift_code}</TableCell>
                      <TableCell>{row.at_doctor}</TableCell>
                      <TableCell>{row.at_duty_officer}</TableCell>
                      <TableCell>{row.route}</TableCell>
                      <TableCell>{row.pickup_location}</TableCell>
                      <TableCell>{row.pickup_route_number}</TableCell>
                      <TableCell>{row.in_schedule}</TableCell>
                      <TableCell>{row.from_schedule}</TableCell>
                      <TableCell>{row.dropoff_location}</TableCell>
                      <TableCell>{row.dropoff_route_number}</TableCell>
                      <TableCell>{row.shift_end}</TableCell>
                      <TableCell>{row.worked_time}</TableCell>
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
                  Импортирани {Math.round((progress / 100) * Math.max(getParsedShiftCount(), 1))} от {getParsedShiftCount()} смени...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleImport}
                disabled={isLoading || (scheduleMode === 'existing' && (!selectedShiftSchedule || shiftSchedules.length === 0)) || (scheduleMode === 'new' && !newScheduleName.trim())}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Импортиране...' : `Импортирай ${getParsedShiftCount()} смени`}
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
