import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { getUser, updateUser } from "../../jwt-frontend-auth/src/auth/authService";

export const EditUserPage = () => {
  const [username, setUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      loadUser(Number(id));
    }
  }, [id]);

  const loadUser = async (userId: number) => {
    setInitialLoading(true);
    try {
      const user = await getUser(userId);
      setUsername(user.username || "");
      setUserId(userId);
    } catch (err: any) {
      setError("Грешка при зареждане на потребителя");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (password || oldPassword || confirmPassword) {
      // If any password field is filled, all must be filled
      if (!oldPassword) {
        setError("Моля въведете старата парола");
        return;
      }
      if (!password) {
        setError("Моля въведете нова парола");
        return;
      }
      if (!confirmPassword) {
        setError("Моля потвърдете новата парола");
        return;
      }
      
      if (password !== confirmPassword) {
        setError("Новите пароли не съвпадат");
        return;
      }

      if (password.length < 6) {
        setError("Новата парола трябва да е поне 6 символа");
        return;
      }

      if (oldPassword === password) {
        setError("Новата парола трябва да е различна от старата");
        return;
      }
    }

    if (username.length < 3) {
      setError("Потребителското име трябва да е поне 3 символа");
      return;
    }

    if (!userId) {
      setError("Невалиден потребител");
      return;
    }

    setLoading(true);
    try {
      await updateUser(userId, username, password || undefined, oldPassword || undefined);
      setSuccess("Потребителят е актуализиран успешно!");
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail 
        || err?.response?.data?.message 
        || err?.message 
        || "Грешка при актуализацията. Моля опитайте отново.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card sx={{ minWidth: 300, maxWidth: 400, width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 2,
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <EditIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Редактиране на потребител
          </Typography>
        </Box>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Box sx={{ marginTop: 1 }}>
              <TextField
                label="Потребителско име"
                name="username"
                type="text"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                margin="normal"
                disabled={loading || !!success}
                helperText="Минимум 3 символа"
              />
              
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
                Промяна на парола (всички полета са задължителни за промяна)
              </Typography>
              
              <TextField
                label="Стара парола"
                name="oldPassword"
                type="password"
                fullWidth
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                margin="normal"
                disabled={loading || !!success}
                helperText="Въведете текущата парола"
              />
              <TextField
                label="Нова парола"
                name="password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                disabled={loading || !!success}
                helperText="Минимум 6 символа"
              />
              <TextField
                label="Потвърдете новата парола"
                name="confirmPassword"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                disabled={loading || !!success}
              />
              <Box sx={{ display: "flex", gap: 2, mt: 3, mb: 2 }}>
                <Button
                  type="button"
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push("/admin")}
                  disabled={loading || !!success}
                >
                  Отказ
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || !!success}
                >
                  {loading ? "Запазване..." : "Запази"}
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
