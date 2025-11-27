import * as React from "react";
import { useState } from "react";
import { useLogin, useNotify } from "react-admin";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ username, password }).catch(() =>
      notify("Грешно потребителско име или парола", { type: "error" })
    );
  };

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
      <Card sx={{ minWidth: 300, maxWidth: 400 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 2,
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Вход в системата
          </Typography>
        </Box>
        <CardContent>
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
              />
              <TextField
                label="Парола"
                name="password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Вход
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};