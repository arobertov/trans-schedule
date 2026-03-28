import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  DeleteButton,
  CreateButton,
  TopToolbar,
  FunctionField,
  useNotify,
} from "react-admin";
import { FormControlLabel, Switch, Tooltip } from "@mui/material";
import { getHighestRoleInfo, ROLES, useCan } from "../../../helpers/RoleMaper";
import { getRegistrationAllowed, setRegistrationAllowed } from "../../../helpers/registrationSettings";
import RoleChip from "./roleChip";

const UsersListActions = () => {
  const can = useCan();
  const notify = useNotify();
  const canManageRegistration = can(ROLES.ADMIN);
  const defaultAllowRegistration = process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === "true";
  const [allowRegistration, setAllowRegistrationState] = React.useState<boolean>(defaultAllowRegistration);
  const [isLoadingToggle, setIsLoadingToggle] = React.useState<boolean>(false);

  React.useEffect(() => {
    let active = true;

    if (!canManageRegistration) {
      return () => {
        active = false;
      };
    }

    setIsLoadingToggle(true);
    getRegistrationAllowed(defaultAllowRegistration)
      .then((value) => {
        if (active) {
          setAllowRegistrationState(value);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingToggle(false);
        }
      });

    return () => {
      active = false;
    };
  }, [canManageRegistration, defaultAllowRegistration]);

  const onToggleRegistration = async (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    const previousValue = allowRegistration;
    setAllowRegistrationState(checked);
    setIsLoadingToggle(true);

    try {
      const savedValue = await setRegistrationAllowed(checked);
      setAllowRegistrationState(savedValue);
      notify('Настройката за регистрация е обновена успешно.');
    } catch {
      setAllowRegistrationState(previousValue);
      notify('Неуспешна промяна на настройката за регистрация.', { type: 'error' });
    } finally {
      setIsLoadingToggle(false);
    }
  };

  return (
    <TopToolbar>
      <CreateButton label="Добави потребител" />
      {canManageRegistration && (
        <Tooltip title="Включва или изключва линка за регистрация на екрана за вход.">
          <FormControlLabel
            label="Позволи регистрация"
            control={<Switch checked={allowRegistration} onChange={onToggleRegistration} disabled={isLoadingToggle} />}
            sx={{ ml: 1, mr: 1 }}
          />
        </Tooltip>
      )}
    </TopToolbar>
  );
};

export const UsersList = () => {
  return (
    <List actions={<UsersListActions />} title="Потребители">
      <Datagrid>
        <TextField source="username" label="Потребителско име" />
        <TextField source="firstName" label="Име"/>
        <TextField source="lastName" label="Фамилия"/>
        <FunctionField 
                source="roles"
                label="Роля"
                render={(record: { roles: string[] }) => {
                    const translatedRole = getHighestRoleInfo(record.roles);
                    return (
                        <RoleChip 
                            roleText={translatedRole.text} 
                            roleType={translatedRole.type} 
                        />
                    );
                }}
            />
        <EditButton label="Редактирай" />
        <DeleteButton label="Изтрий" />
      </Datagrid>
    </List>
  );
};
