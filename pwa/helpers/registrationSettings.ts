import { getToken } from '../jwt-frontend-auth/src/utils/token';

export const registrationToggleEvent = 'registration-toggle-change';

const parseBoolean = (value: unknown, defaultValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  return defaultValue;
};

export const getRegistrationAllowed = async (defaultValue: boolean): Promise<boolean> => {
  try {
    const response = await fetch('/registration-setting', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return defaultValue;
    }

    const payload = await response.json();
    return parseBoolean(payload?.enabled, defaultValue);
  } catch {
    return defaultValue;
  }
};

export const setRegistrationAllowed = async (enabled: boolean): Promise<boolean> => {
  const token = getToken();

  const response = await fetch('/registration-setting', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    throw new Error('Неуспешна промяна на настройката за регистрация.');
  }

  const payload = await response.json();
  const value = parseBoolean(payload?.enabled, enabled);
  window.dispatchEvent(new CustomEvent(registrationToggleEvent, { detail: { enabled: value } }));

  return value;
};
