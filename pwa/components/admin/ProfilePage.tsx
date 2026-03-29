import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNotify, usePermissions } from 'react-admin';
import api from '../../jwt-frontend-auth/src/api/apiClient';
import { hasMinimumRole, ROLES } from '../../helpers/RoleMaper';

type CurrentUser = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

type ProfileFormData = {
  username: string;
  firstName: string;
  lastName: string;
  oldPassword: string;
  plainPassword: string;
  confirmPassword: string;
};

export const ProfilePage = () => {
  const notify = useNotify();
  const { permissions } = usePermissions();
  const isAdminOrSuperAdmin = hasMinimumRole(permissions, ROLES.ADMIN);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [formData, setFormData] = React.useState<ProfileFormData>({
    username: '',
    firstName: '',
    lastName: '',
    oldPassword: '',
    plainPassword: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await api.get('/me');
        const currentUser: CurrentUser = response.data;
        setUser(currentUser);
        setFormData((prev: ProfileFormData) => ({
          ...prev,
          username: currentUser.username ?? '',
          firstName: currentUser.firstName ?? '',
          lastName: currentUser.lastName ?? '',
        }));
      } catch (loadError: any) {
        const message = loadError?.response?.data?.message
          || loadError?.response?.data?.detail
          || loadError?.response?.data?.['hydra:description']
          || 'Грешка при зареждане на профила.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev: ProfileFormData) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!user?.id) {
      setError('Липсва идентификатор на текущия потребител.');
      return;
    }

    if (formData.plainPassword && formData.plainPassword !== formData.confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    if (formData.plainPassword && !formData.oldPassword) {
      setError('Старата парола е задължителна за промяна на паролата.');
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      if (isAdminOrSuperAdmin) {
        payload.username = formData.username;
      }

      if (formData.plainPassword) {
        payload.oldPassword = formData.oldPassword;
        payload.plainPassword = formData.plainPassword;
      }

      await api.patch(`/users/${user.id}`, payload);

      notify('Профилът е обновен успешно.');
      setFormData((prev: ProfileFormData) => ({
        ...prev,
        oldPassword: '',
        plainPassword: '',
        confirmPassword: '',
      }));
    } catch (saveError: any) {
      const message = saveError?.response?.data?.message
        || saveError?.response?.data?.detail
        || saveError?.response?.data?.['hydra:description']
        || 'Грешка при запис на профила.';
      setError(message);
      notify(message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="60vh" pt={4}>
      <Card sx={{ width: '100%', maxWidth: 560 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Моят профил
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!loading && user && (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {isAdminOrSuperAdmin ? (
                  <TextField
                    label="Потребителско име"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                ) : (
                  <TextField
                    label="Потребителско име"
                    value={formData.username}
                    fullWidth
                    disabled
                    helperText="Потребителското име не може да се променя."
                  />
                )}

                <TextField
                  label="Име"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  fullWidth
                />

                <TextField
                  label="Фамилия"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  fullWidth
                />

                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Смяна на парола (по избор)
                </Typography>

                <TextField
                  label="Стара парола"
                  name="oldPassword"
                  type="password"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  fullWidth
                />

                <TextField
                  label="Нова парола"
                  name="plainPassword"
                  type="password"
                  value={formData.plainPassword}
                  onChange={handleChange}
                  fullWidth
                />

                <TextField
                  label="Потвърди нова парола"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  fullWidth
                />

                <Box display="flex" justifyContent="flex-end" pt={1}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Запис...' : 'Запази'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
