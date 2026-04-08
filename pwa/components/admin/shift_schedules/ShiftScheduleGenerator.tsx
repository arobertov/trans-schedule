import React, { useState, useCallback, ChangeEvent } from "react";
import {
  useGetList,
  useNotify,
  useRedirect,
  Title,
} from "react-admin";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  SelectChangeEvent,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PreviewIcon from "@mui/icons-material/Preview";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { getToken } from "../../../jwt-frontend-auth/src/auth/authService";

// ─── Defaults matching the Python algorithm ───
const DEFAULTS = {
  max_drive_minutes: 150,
  min_rest_minutes: 50,
  max_morning_minutes: 300,
  max_day_minutes: 660,
  max_night_minutes: 660,
  min_morning_minutes: 180,
  min_day_minutes: 540,
  min_night_minutes: 480,
  morning_threshold: "09:30",
  morning_station14_threshold: "07:30",
  night_threshold: "18:00",
  day_target_minutes: 540,
  cross_train_handoff_minutes: 20,
  doctor_offset_minutes: 60,
  duty_officer_offset_minutes: 30,
  night_work_start: "22:00",
  night_work_end: "06:00",
  crew_change_stations: "14_1, 14_2",
  crew_change_station_label: "МС-14",
  target_morning_shifts: 0,
  target_day_shifts: 0,
  target_night_shifts: 0,
};

type ShiftPreview = {
  shift_id: string;
  shift_type: string;
  start: string;
  end: string;
  drive: string;
  total: string;
  blocks_count: number;
  routes: string[];
};

type UnassignedBlock = {
  route_id: string;
  train: number;
  block_index: number;
  board_station: string;
  board_time: string;
  alight_station: string;
  alight_time: string;
};

type GenerateResponse = {
  status: string;
  schedule_id?: number;
  schedule_iri?: string;
  shifts_count: number;
  morning_count: number;
  day_count: number;
  night_count: number;
  validation: {
    ok: boolean;
    warnings: string[];
    errors: string[];
  };
  shifts_preview: ShiftPreview[];
  unassigned_blocks: UnassignedBlock[];
  feedback: string[];
  parameters_used: Record<string, unknown>;
};

const SHIFT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  С: { label: "Сутрешна", color: "#4CAF50" },
  Д: { label: "Дневна", color: "#FF9800" },
  Н: { label: "Нощна", color: "#F44336" },
};

const minutesToHMM = (m: number): string => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h}:${String(mins).padStart(2, "0")}`;
};

const hmmToMinutes = (hmm: string): number => {
  const [h, m] = hmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const ShiftScheduleGenerator = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  // ─── Input data ───
  const [trainScheduleId, setTrainScheduleId] = useState<number | "">("");
  const { data: trainSchedules, isLoading: loadingTrainSchedules } = useGetList(
    "train_schedules",
    { pagination: { page: 1, perPage: 100 }, sort: { field: "name", order: "ASC" } }
  );

  // ─── Output config ───
  const [outputMode, setOutputMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [existingScheduleId, setExistingScheduleId] = useState<number | "">("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const { data: shiftSchedules, isLoading: loadingShiftSchedules } = useGetList(
    "shift_schedules",
    { pagination: { page: 1, perPage: 200 }, sort: { field: "name", order: "ASC" } }
  );

  // ─── Parameters (all 13) ───
  const [params, setParams] = useState({ ...DEFAULTS });

  const updateParam = (key: string, value: string | number) => {
    setParams((prev: typeof DEFAULTS) => ({ ...prev, [key]: value }));
  };

  // ─── State ───
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<GenerateResponse | null>(null);

  // ─── API call helper ───
  const callApi = useCallback(
    async (endpoint: string): Promise<GenerateResponse> => {
      const token = getToken();
      const body: Record<string, unknown> = {
        train_schedule_id: trainScheduleId,
        ...params,
      };

      if (endpoint.includes("generate") && !endpoint.includes("preview")) {
        if (outputMode === "new") {
          body.name = name;
          body.description = description || null;
          body.existing_schedule_id = null;
        } else {
          body.existing_schedule_id = existingScheduleId || null;
          body.replace_existing = replaceExisting;
        }
      }

      const response = await fetch(`${window.origin}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || errorData?.message || `Грешка ${response.status}`
        );
      }

      return response.json();
    },
    [trainScheduleId, params, outputMode, name, description, existingScheduleId, replaceExisting]
  );

  // ─── Preview ───
  const handlePreview = async () => {
    if (!trainScheduleId) {
      notify("Изберете разписание на влаковете", { type: "warning" });
      return;
    }
    setLoading(true);
    setPreviewResult(null);
    try {
      const result = await callApi("/api/shift_schedules/generate/preview");
      setPreviewResult(result);
    } catch (err: any) {
      notify(err.message || "Грешка при генерирането", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!trainScheduleId) {
      notify("Изберете разписание на влаковете", { type: "warning" });
      return;
    }
    if (outputMode === "new" && !name.trim()) {
      notify("Въведете име за новия график", { type: "warning" });
      return;
    }
    if (outputMode === "existing" && !existingScheduleId) {
      notify("Изберете съществуващ график", { type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const result = await callApi("/api/shift_schedules/generate");
      notify(
        `Генерирани ${result.shifts_count} смени (С: ${result.morning_count}, Д: ${result.day_count}, Н: ${result.night_count}) — проект`,
        { type: "success" }
      );
      if (result.schedule_id) {
        redirect("/shift-schedules/draft/" + result.schedule_id);
      }
    } catch (err: any) {
      notify(err.message || "Грешка при запазването", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title title="Генериране на смени" />
      <Box sx={{ maxWidth: 1100, mx: "auto", mt: 2, mb: 4 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AutoFixHighIcon color="primary" />
              <Typography variant="h5">Автоматичен генератор на смени</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Изберете разписание на влаковете, настройте параметрите и генерирайте
              график на смените автоматично.
            </Typography>
          </CardContent>
        </Card>

        {/* ─── Section 1: Input ─── */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">1. Входни данни</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth>
              <InputLabel id="train-schedule-label">Разписание на влаковете</InputLabel>
              <Select
                labelId="train-schedule-label"
                value={trainScheduleId}
                label="Разписание на влаковете"
                onChange={(e: SelectChangeEvent<number | "">) => setTrainScheduleId(e.target.value as number)}
                disabled={loadingTrainSchedules}
              >
                {trainSchedules?.map((ts: any) => (
                  <MenuItem key={ts.id} value={typeof ts.id === "string" ? parseInt(ts.id.split("/").pop()!, 10) : ts.id}>
                    {ts.name}
                    {ts.description ? ` — ${ts.description}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>

        {/* ─── Section 2: Output ─── */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">2. Изходен график</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl component="fieldset">
              <RadioGroup
                value={outputMode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMode(e.target.value as "new" | "existing")}
              >
                <FormControlLabel value="new" control={<Radio />} label="Нов график" />
                <FormControlLabel value="existing" control={<Radio />} label="Съществуващ график" />
              </RadioGroup>
            </FormControl>

            {outputMode === "new" && (
              <Box mt={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Име на графика"
                      value={name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Описание"
                      value={description}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                      multiline
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {outputMode === "existing" && (
              <Box mt={2}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="existing-schedule-label">Съществуващ график</InputLabel>
                      <Select
                        labelId="existing-schedule-label"
                        value={existingScheduleId}
                        label="Съществуващ график"
                        onChange={(e: SelectChangeEvent<number | "">) => setExistingScheduleId(e.target.value as number)}
                        disabled={loadingShiftSchedules}
                      >
                        {shiftSchedules?.map((ss: any) => (
                          <MenuItem key={ss.id} value={typeof ss.id === "string" ? parseInt(ss.id.split("/").pop()!, 10) : ss.id}>
                            {ss.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={replaceExisting}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setReplaceExisting(e.target.checked)}
                        />
                      }
                      label="Замени съществуващите смени"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* ─── Section 3: Block params ─── */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">3. Параметри на блокове</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Макс. непрекъснато управление (мин)"
                  value={params.max_drive_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("max_drive_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.max_drive_minutes)}`}
                  inputProps={{ min: 1, max: 600 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Мин. почивка между блокове (мин)"
                  value={params.min_rest_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("min_rest_minutes", parseInt(e.target.value, 10) || 0)}
                  inputProps={{ min: 0, max: 300 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Станция за оборот (качване / слизане)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Станции за оборот (разделени със запетая)"
                  value={params.crew_change_stations}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("crew_change_stations", e.target.value)}
                  helperText="Идентификатори на станции, напр. 14_1, 14_2"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Етикет за станция за оборот"
                  value={params.crew_change_station_label}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("crew_change_station_label", e.target.value)}
                  helperText="Име за показване, напр. МС-14"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ─── Section 4: Shift params ─── */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">4. Параметри на смените</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Макс. продължителност на смяна
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Макс. сутрешна смяна (мин)"
                  value={params.max_morning_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("max_morning_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.max_morning_minutes)}`}
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Макс. дневна смяна (мин)"
                  value={params.max_day_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("max_day_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.max_day_minutes)}`}
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Макс. нощна смяна (мин)"
                  value={params.max_night_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("max_night_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.max_night_minutes)}`}
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Мин. продължителност на смяна
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Мин. сутрешна смяна (мин)"
                  value={params.min_morning_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("min_morning_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.min_morning_minutes)}`}
                  inputProps={{ min: 0, max: 1440 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Мин. дневна смяна (мин)"
                  value={params.min_day_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("min_day_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.min_day_minutes)}`}
                  inputProps={{ min: 0, max: 1440 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Мин. нощна смяна (мин)"
                  value={params.min_night_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("min_night_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.min_night_minutes)}`}
                  inputProps={{ min: 0, max: 1440 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Прагове за класификация
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Праг сутрешна (начало до)"
                  value={params.morning_threshold}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("morning_threshold", e.target.value)}
                  placeholder="HH:MM"
                  helperText="Блокове преди този час са сутрешни"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Праг ранен ст.14 стартер"
                  value={params.morning_station14_threshold}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("morning_station14_threshold", e.target.value)}
                  placeholder="HH:MM"
                  helperText="Стартери от ст.14 преди този час"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Праг нощна (начало от)"
                  value={params.night_threshold}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("night_threshold", e.target.value)}
                  placeholder="HH:MM"
                  helperText="Блокове след този час са нощни"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Стоп дневна смяна (макс. цел, мин)"
                  value={params.day_target_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("day_target_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText={`= ${minutesToHMM(params.day_target_minutes)}`}
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Брой смени (0 = автоматично)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Брой сутрешни смени"
                  value={params.target_morning_shifts}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("target_morning_shifts", parseInt(e.target.value, 10) || 0)}
                  helperText="0 = автоматично определяне"
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Брой дневни смени"
                  value={params.target_day_shifts}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("target_day_shifts", parseInt(e.target.value, 10) || 0)}
                  helperText="0 = автоматично определяне"
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Брой нощни смени"
                  value={params.target_night_shifts}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("target_night_shifts", parseInt(e.target.value, 10) || 0)}
                  helperText="0 = автоматично определяне"
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Междувлаков преход
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Макс. време за преход (мин)"
                  value={params.cross_train_handoff_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("cross_train_handoff_minutes", parseInt(e.target.value, 10) || 0)}
                  helperText="Макс. разлика между край и начало на два влака за слепване в една смяна"
                  inputProps={{ min: 0, max: 120 }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ─── Section 5: Output params ─── */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">5. Параметри на изхода</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="При лекар (офсет преди начало, мин)"
                  value={params.doctor_offset_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("doctor_offset_minutes", parseInt(e.target.value, 10) || 0)}
                  inputProps={{ min: 0, max: 120 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="При дежурен (офсет преди начало, мин)"
                  value={params.duty_officer_offset_minutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("duty_officer_offset_minutes", parseInt(e.target.value, 10) || 0)}
                  inputProps={{ min: 0, max: 120 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Нощен труд от (HH:MM)"
                  value={params.night_work_start}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("night_work_start", e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Нощен труд до (HH:MM)"
                  value={params.night_work_end}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("night_work_end", e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ─── Actions ─── */}
        <Box display="flex" gap={2} mt={3} mb={2}>
          <Button
            variant="outlined"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <PreviewIcon />}
            onClick={handlePreview}
            disabled={loading || !trainScheduleId}
          >
            Преглед
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={loading || !trainScheduleId}
          >
            Генерирай и запази
          </Button>
        </Box>

        {/* ─── Results ─── */}
        {previewResult && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Резултат от генерирането
              </Typography>

              {/* Summary chips */}
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip
                  label={`Общо: ${previewResult.shifts_count}`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Сутрешни (С): ${previewResult.morning_count}`}
                  sx={{ backgroundColor: "#4CAF50", color: "#fff" }}
                />
                <Chip
                  label={`Дневни (Д): ${previewResult.day_count}`}
                  sx={{ backgroundColor: "#FF9800", color: "#fff" }}
                />
                <Chip
                  label={`Нощни (Н): ${previewResult.night_count}`}
                  sx={{ backgroundColor: "#F44336", color: "#fff" }}
                />
              </Box>

              {/* Validation */}
              {previewResult.validation.ok ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <AlertTitle>Валидацията премина успешно</AlertTitle>
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <AlertTitle>
                    Открити са {previewResult.validation.errors.length} грешки
                  </AlertTitle>
                </Alert>
              )}

              {previewResult.validation.errors.length > 0 && (
                <Box mb={2}>
                  {previewResult.validation.errors.map((err: string, i: number) => (
                    <Alert key={i} severity="error" sx={{ mb: 0.5 }} icon={<ErrorIcon />}>
                      {err}
                    </Alert>
                  ))}
                </Box>
              )}

              {previewResult.validation.warnings.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Предупреждения и проверки ({previewResult.validation.warnings.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {previewResult.validation.warnings.map((warn: string, i: number) => (
                      <Alert
                        key={i}
                        severity={warn.startsWith("OK") ? "success" : "warning"}
                        sx={{ mb: 0.5 }}
                        icon={warn.startsWith("OK") ? <CheckCircleIcon /> : <WarningIcon />}
                      >
                        {warn.startsWith("OK") ? warn.substring(3) : warn.startsWith("WARN") ? warn.substring(5) : warn}
                      </Alert>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Feedback messages */}
              {previewResult.feedback && previewResult.feedback.length > 0 && (
                <Accordion defaultExpanded sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" color="warning.main">
                      Обратна информация от генератора ({previewResult.feedback.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {previewResult.feedback.map((msg: string, i: number) => (
                      <Alert key={i} severity="info" sx={{ mb: 0.5 }}>
                        {msg}
                      </Alert>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Unassigned blocks */}
              {previewResult.unassigned_blocks && previewResult.unassigned_blocks.length > 0 && (
                <Accordion defaultExpanded sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" color="error.main">
                      Неразпределени блокове ({previewResult.unassigned_blocks.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Влак</TableCell>
                            <TableCell>Маршрут</TableCell>
                            <TableCell>От станция</TableCell>
                            <TableCell>До станция</TableCell>
                            <TableCell>Начало</TableCell>
                            <TableCell>Край</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {previewResult.unassigned_blocks.map((ub: UnassignedBlock, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{ub.train}</TableCell>
                              <TableCell>{ub.route_id}</TableCell>
                              <TableCell>{ub.board_station}</TableCell>
                              <TableCell>{ub.alight_station}</TableCell>
                              <TableCell>{ub.board_time}</TableCell>
                              <TableCell>{ub.alight_time}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Shifts table */}
              {previewResult.shifts_preview.length > 0 && (
                <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>№</TableCell>
                        <TableCell>Смяна</TableCell>
                        <TableCell>Тип</TableCell>
                        <TableCell>Начало</TableCell>
                        <TableCell>Край</TableCell>
                        <TableCell>Шофиране</TableCell>
                        <TableCell>Общо</TableCell>
                        <TableCell>Блокове</TableCell>
                        <TableCell>Маршрути</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewResult.shifts_preview.map((shift: ShiftPreview, i: number) => {
                        const typeInfo = SHIFT_TYPE_LABELS[shift.shift_type] || {
                          label: shift.shift_type,
                          color: "#999",
                        };
                        return (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>
                              {shift.shift_id}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={typeInfo.label}
                                size="small"
                                sx={{ backgroundColor: typeInfo.color, color: "#fff" }}
                              />
                            </TableCell>
                            <TableCell>{shift.start}</TableCell>
                            <TableCell>{shift.end}</TableCell>
                            <TableCell>{shift.drive}</TableCell>
                            <TableCell>{shift.total}</TableCell>
                            <TableCell>{shift.blocks_count}</TableCell>
                            <TableCell>{shift.routes.join(", ")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Parameters used */}
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    Приложени параметри
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ fontSize: 12, overflow: "auto" }}>
                    {JSON.stringify(previewResult.parameters_used, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};
