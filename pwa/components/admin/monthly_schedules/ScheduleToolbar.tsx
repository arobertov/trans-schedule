import React from 'react';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography,
    IconButton,
} from '@mui/material';
import { Fullscreen, FullscreenExit, PersonAdd } from '@mui/icons-material';
import { RecalculatePersonalAccountsButton } from './RecalculatePersonalAccountsButton';
import { SCHEDULE_PERF_DEBUG } from './scheduleConstants';
import type { DevPerfSnapshot } from './scheduleConstants';

export interface ScheduleToolbarProps {
    record: any;
    calendarStats: { workDays: number; workHours: number } | null;
    showMatrixConfig: boolean;
    // Matrix section
    matrixData: any[];
    selectedMatrixId: string;
    onSelectedMatrixIdChange: (id: string) => void;
    periods: { p1End: number; p2End: number };
    onPeriodsChange: (fn: (prev: { p1End: number; p2End: number }) => { p1End: number; p2End: number }) => void;
    matrixValidationColors: { single: string; duplicate: string; weekend: string };
    onMatrixValidationColorsChange: (fn: (prev: { single: string; duplicate: string; weekend: string }) => { single: string; duplicate: string; weekend: string }) => void;
    // Shift schedule
    shiftScheduleOptions: any[];
    weekdayShiftSchedule: string;
    onWeekdayShiftScheduleChange: (val: string) => void;
    holidayShiftSchedule: string;
    onHolidayShiftScheduleChange: (val: string) => void;
    // Previous month balance
    linkPreviousMonthBalance: boolean;
    onLinkPreviousMonthBalanceChange: (val: boolean) => void;
    previousMonthStatus: string;
    previousMonthLabel: string;
    // Recalculation
    isRecalculating: boolean;
    // Employee management
    isLoading: boolean;
    onOpenManage: () => void;
    // Auto-save
    autoSaveStatus: string;
    // Dev perf
    devPerf: DevPerfSnapshot;
    // Fullscreen / save
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onSave: () => void;
}

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
    record,
    calendarStats,
    showMatrixConfig,
    matrixData,
    selectedMatrixId,
    onSelectedMatrixIdChange,
    periods,
    onPeriodsChange,
    matrixValidationColors,
    onMatrixValidationColorsChange,
    shiftScheduleOptions,
    weekdayShiftSchedule,
    onWeekdayShiftScheduleChange,
    holidayShiftSchedule,
    onHolidayShiftScheduleChange,
    linkPreviousMonthBalance,
    onLinkPreviousMonthBalanceChange,
    previousMonthStatus,
    previousMonthLabel,
    isRecalculating,
    isLoading,
    onOpenManage,
    autoSaveStatus,
    devPerf,
    isFullscreen,
    onToggleFullscreen,
    onSave,
}) => {
    return (
        <Box p={1} bgcolor="#f5f5f5" display="flex" gap={2} alignItems="center" flexWrap="wrap">
            {calendarStats && (
                <Box display="flex" alignItems="center" bgcolor="#e3f2fd" px={2} py={1} borderRadius={1} border="1px solid #90caf9" mr={2}>
                    <Typography variant="body2" color="primary" fontWeight="bold" sx={{ mr: 1 }}>
                        {new Date(record.year, record.month - 1).toLocaleString('bg-BG', { month: 'long' }).toUpperCase()}:
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {calendarStats.workDays} дни / {calendarStats.workHours} часа
                    </Typography>
                </Box>
            )}

            <Box
                display="flex"
                alignItems="center"
                px={1.5}
                py={0.75}
                borderRadius={1}
                bgcolor={showMatrixConfig ? "#e8f5e9" : "#f3f4f6"}
                border={showMatrixConfig ? "1px solid #a5d6a7" : "1px solid #d1d5db"}
            >
                <Typography variant="caption" fontWeight="bold" color={showMatrixConfig ? "#2e7d32" : "textSecondary"}>
                    {showMatrixConfig ? 'Режим: С матрица' : 'Режим: Без матрица'}
                </Typography>
            </Box>

            {showMatrixConfig && (
                <>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">Матрица:</Typography>
                        <FormControl size="small" sx={{ minWidth: 250 }}>
                            <Select
                                value={selectedMatrixId}
                                onChange={(e) => onSelectedMatrixIdChange(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="" disabled><em>Избери Матрица</em></MenuItem>
                                {matrixData.map((m: any) => {
                                    const monthName = new Date(m.year, m.month - 1).toLocaleString('bg-BG', { month: 'long' });
                                    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                    const patternName = (typeof m === 'object' && m.patternName) ? m.patternName : (m.pattern || 'Unknown');
                                    const label = `${capitalizedMonth} - ${patternName}`;
                                    return <MenuItem key={m.id} value={String(m.id)}>{label}</MenuItem>;
                                })}
                            </Select>
                        </FormControl>
                    </Box>

                    <TextField
                        label="П1 Край"
                        type="number"
                        size="small"
                        value={periods.p1End}
                        onChange={e => onPeriodsChange(p => ({ ...p, p1End: Number(e.target.value) }))}
                        sx={{ width: 100 }}
                    />
                    <TextField
                        label="П2 Край"
                        type="number"
                        size="small"
                        value={periods.p2End}
                        onChange={e => onPeriodsChange(p => ({ ...p, p2End: Number(e.target.value) }))}
                        sx={{ width: 100 }}
                    />

                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" fontWeight="bold">Уникален</Typography>
                        <TextField
                            type="color"
                            size="small"
                            value={matrixValidationColors.single}
                            onChange={e => onMatrixValidationColorsChange(prev => ({ ...prev, single: e.target.value }))}
                            sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                        />
                    </Box>

                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" fontWeight="bold">Дублиран</Typography>
                        <TextField
                            type="color"
                            size="small"
                            value={matrixValidationColors.duplicate}
                            onChange={e => onMatrixValidationColorsChange(prev => ({ ...prev, duplicate: e.target.value }))}
                            sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                        />
                    </Box>

                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" fontWeight="bold">Празнични</Typography>
                        <TextField
                            type="color"
                            size="small"
                            value={matrixValidationColors.weekend}
                            onChange={e => onMatrixValidationColorsChange(prev => ({ ...prev, weekend: e.target.value }))}
                            sx={{ width: 46, minWidth: 46, '& .MuiInputBase-input': { p: 0.25, height: 28 } }}
                        />
                    </Box>

                    <RecalculatePersonalAccountsButton />
                </>
            )}

            {showMatrixConfig ? (
                <>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">Делник:</Typography>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <Select
                                value={weekdayShiftSchedule}
                                onChange={(e) => onWeekdayShiftScheduleChange(String(e.target.value))}
                                displayEmpty
                            >
                                <MenuItem value=""><em>График за делник</em></MenuItem>
                                {shiftScheduleOptions.map((s: any) => (
                                    <MenuItem key={String(s.id)} value={String(s['@id'] || `/shift_schedules/${s.id}`)}>
                                        {s.name || `График #${s.id}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">Празник:</Typography>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <Select
                                value={holidayShiftSchedule}
                                onChange={(e) => onHolidayShiftScheduleChange(String(e.target.value))}
                                displayEmpty
                            >
                                <MenuItem value=""><em>График за празник</em></MenuItem>
                                {shiftScheduleOptions.map((s: any) => (
                                    <MenuItem key={`h-${String(s.id)}`} value={String(s['@id'] || `/shift_schedules/${s.id}`)}>
                                        {s.name || `График #${s.id}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </>
            ) : (
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="bold">График смени:</Typography>
                    <FormControl size="small" sx={{ minWidth: 240 }}>
                        <Select
                            value={weekdayShiftSchedule}
                            onChange={(e) => onWeekdayShiftScheduleChange(String(e.target.value))}
                            displayEmpty
                        >
                            <MenuItem value=""><em>Избери график за смени</em></MenuItem>
                            {shiftScheduleOptions.map((s: any) => (
                                <MenuItem key={`nm-${String(s.id)}`} value={String(s['@id'] || `/shift_schedules/${s.id}`)}>
                                    {s.name || `График #${s.id}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            <FormControlLabel
                control={
                    <Switch
                        checked={linkPreviousMonthBalance}
                        onChange={(e) => onLinkPreviousMonthBalanceChange(e.target.checked)}
                    />
                }
                label="Вземи +/- от минал месец"
            />

            <Box
                display="flex"
                alignItems="center"
                px={1.5}
                py={0.75}
                borderRadius={1}
                bgcolor={
                    previousMonthStatus === 'found'
                        ? '#e8f5e9'
                        : previousMonthStatus === 'missing'
                            ? '#fff3e0'
                            : previousMonthStatus === 'error'
                                ? '#ffebee'
                                : previousMonthStatus === 'loading'
                                    ? '#e3f2fd'
                                    : '#f3f4f6'
                }
                border={
                    previousMonthStatus === 'found'
                        ? '1px solid #a5d6a7'
                        : previousMonthStatus === 'missing'
                            ? '1px solid #ffcc80'
                            : previousMonthStatus === 'error'
                                ? '1px solid #ef9a9a'
                                : previousMonthStatus === 'loading'
                                    ? '1px solid #90caf9'
                                    : '1px solid #d1d5db'
                }
                gap={1}
            >
                {previousMonthStatus === 'loading' && <CircularProgress size={14} />}
                <Typography variant="caption" fontWeight="bold" color={previousMonthStatus === 'error' ? 'error.main' : 'textSecondary'}>
                    {previousMonthStatus === 'off' && 'Минал месец: изкл.'}
                    {previousMonthStatus === 'loading' && `Минал месец: търси ${previousMonthLabel || ''}`}
                    {previousMonthStatus === 'found' && `Минал месец: намерен ${previousMonthLabel || ''}`}
                    {previousMonthStatus === 'missing' && `Минал месец: няма данни за ${previousMonthLabel || ''}`}
                    {previousMonthStatus === 'error' && 'Минал месец: грешка при зареждане'}
                </Typography>
            </Box>

            {isRecalculating && (
                <Box
                    display="flex"
                    alignItems="center"
                    px={1.5}
                    py={0.75}
                    borderRadius={1}
                    bgcolor="#e3f2fd"
                    border="1px solid #90caf9"
                    gap={1}
                >
                    <CircularProgress size={14} />
                    <Typography variant="caption" fontWeight="bold" color="textSecondary">
                        Преизчисляване...
                    </Typography>
                </Box>
            )}

            <Button variant="outlined" onClick={onOpenManage} disabled={isLoading} startIcon={<PersonAdd />} sx={{ mr: 1 }}>
                Служители
            </Button>

            <Box
                display="flex"
                alignItems="center"
                px={1.5}
                py={0.75}
                borderRadius={1}
                bgcolor={
                    autoSaveStatus === 'saving' || autoSaveStatus === 'pending'
                        ? '#fff3e0'
                        : autoSaveStatus === 'saved'
                            ? '#e8f5e9'
                            : autoSaveStatus === 'error'
                                ? '#ffebee'
                                : '#f3f4f6'
                }
                border={
                    autoSaveStatus === 'saving' || autoSaveStatus === 'pending'
                        ? '1px solid #ffcc80'
                        : autoSaveStatus === 'saved'
                            ? '1px solid #a5d6a7'
                            : autoSaveStatus === 'error'
                                ? '1px solid #ef9a9a'
                                : '1px solid #d1d5db'
                }
            >
                <Typography variant="caption" fontWeight="bold" color={autoSaveStatus === 'error' ? 'error.main' : 'textSecondary'}>
                    {autoSaveStatus === 'pending' && 'Авто-запазване: изчаква...'}
                    {autoSaveStatus === 'saving' && 'Авто-запазване: записва...'}
                    {autoSaveStatus === 'saved' && 'Авто-запазване: запазено'}
                    {autoSaveStatus === 'error' && 'Авто-запазване: грешка'}
                    {autoSaveStatus === 'idle' && 'Авто-запазване: изкл.'}
                </Typography>
            </Box>

            {SCHEDULE_PERF_DEBUG && (
                <Box
                    display="flex"
                    flexDirection="column"
                    px={1.25}
                    py={0.75}
                    borderRadius={1}
                    bgcolor="#eef2ff"
                    border="1px dashed #94a3b8"
                    minWidth={280}
                >
                    <Typography variant="caption" fontWeight="bold" color="#334155">
                        DEV perf
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Init interactive: {devPerf.initInteractiveMs}ms
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Monthly: {devPerf.monthlyLoadSource} ({devPerf.monthlyLoadMs}ms)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Shift W/H: {devPerf.weekdayShiftSource}/{devPerf.holidayShiftSource} ({devPerf.weekdayShiftMs}/{devPerf.holidayShiftMs}ms)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Prev month: {devPerf.previousMonthSource} ({devPerf.previousMonthMs}ms)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Recalc: {devPerf.recalculationMs}ms
                    </Typography>
                </Box>
            )}

            <Box flex={1} />

            <IconButton onClick={onToggleFullscreen} color="primary" title={isFullscreen ? "Изход от цял екран" : "Цял екран"}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>

            <Button variant="contained" color="primary" onClick={onSave}>
                Запази Промените
            </Button>
        </Box>
    );
};
