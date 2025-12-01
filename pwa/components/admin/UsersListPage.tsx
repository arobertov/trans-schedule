import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import api from "../../jwt-frontend-auth/src/api/apiClient";

interface User {
  id: number;
  username: string;
}

export const UsersListPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/users");
      const usersData = response.data["hydra:member"] || response.data;
      setUsers(usersData);
    } catch (err: any) {
      setError("Грешка при зареждане на потребителите");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userId: number) => {
    router.push(`/admin/users/${userId}/edit`);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Сигурни ли сте, че искате да изтриете този потребител?")) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      await loadUsers();
    } catch (err: any) {
      setError("Грешка при изтриване на потребителя");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h5" component="h2">
              Потребители
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push("/admin/register")}
            >
              Добави потребител
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Потребителско име</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Няма налични потребители
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => handleEdit(user.id)}
                          title="Редактирай"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(user.id)}
                          title="Изтрий"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button variant="outlined" onClick={() => router.push("/admin")}>
              Назад към администрацията
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
