import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNotify, Title } from "react-admin";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { getToken } from "../../../jwt-frontend-auth/src/auth/authService";
import { ShiftScheduleUniverTable } from "./ShiftScheduleUniverTable";

type ScheduleInfo = {
  id: number;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export const DraftShiftSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [operatorNotes, setOperatorNotes] = useState("");

  // Fetch schedule info
  useEffect(() => {
    if (!id) return;

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${window.origin}/shift_schedules/${id}`, {
          headers: {
            Accept: "application/ld+json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`Грешка ${res.status}`);
        const data = await res.json();
        setSchedule({
          id: data.id ?? parseInt(id, 10),
          name: data.name ?? "",
          description: data.description ?? "",
          status: data.status ?? "проект",
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
        setApproved(data.status === "активен");
      } catch (err: any) {
        notify(err.message || "Грешка при зареждане на графика", { type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [id, notify]);

  const handleApprove = useCallback(async () => {
    if (!id) return;

    setApproving(true);
    try {
      const token = getToken();
      const res = await fetch(`${window.origin}/api/shift_schedules/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          notes: operatorNotes || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || `Грешка ${res.status}`);
      }

      const data = await res.json();
      setApproved(true);
      if (schedule) {
        setSchedule({ ...schedule, status: "активен" });
      }
      notify(data.message || "Графикът е одобрен успешно", { type: "success" });
    } catch (err: any) {
      notify(err.message || "Грешка при одобрение", { type: "error" });
    } finally {
      setApproving(false);
    }
  }, [id, operatorNotes, schedule, notify]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (!schedule) {
    return (
      <Box p={3}>
        <Alert severity="error">Графикът не е намерен</Alert>
      </Box>
    );
  }

  return (
    <>
      <Title title={`Проектографик: ${schedule.name}`} />
      <Box p={2}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Проектографик на смените
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {schedule.name}
              {schedule.description && ` — ${schedule.description}`}
            </Typography>
          </Box>
          <Chip
            label={approved ? "Активен" : "Проект"}
            color={approved ? "success" : "warning"}
            variant="filled"
            sx={{ fontSize: "1rem", py: 2, px: 1 }}
          />
        </Box>

        {/* Approval section */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            {approved ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <AlertTitle>Графикът е одобрен</AlertTitle>
                Този график е активен и се използва в системата.
              </Alert>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Преглед и одобрение
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Прегледайте генерираните смени по-долу. Ако всичко е наред,
                  одобрете графика, за да стане активен. При нужда от промяна,
                  добавете бележки и не одобрявайте — генерирайте отново с
                  коригирани параметри.
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Бележки на оператора (по избор)"
                  value={operatorNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOperatorNotes(e.target.value)}
                  placeholder="Напишете забележки или предложения за промени..."
                  sx={{ mb: 2 }}
                />

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={approving ? <CircularProgress size={20} color="inherit" /> : <ThumbUpIcon />}
                    onClick={handleApprove}
                    disabled={approving}
                  >
                    {approving ? "Одобряване..." : "Одобри графика"}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/shift-schedules/generate")}
                  >
                    Обратно към генератора
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        {/* Schedule table (reuse the existing Univer spreadsheet viewer) */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Диаграма на смените
            </Typography>
            <ShiftScheduleUniverTable record={schedule as any} />
          </CardContent>
        </Card>

        {/* Post-approve actions */}
        {approved && (
          <Box display="flex" gap={2} mt={2}>
            <Button
              variant="contained"
              onClick={() => navigate(`/shift_schedules/${id}/show`)}
            >
              Виж в актуалните графици
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/shift_schedules")}
            >
              Към списъка с графици
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};
