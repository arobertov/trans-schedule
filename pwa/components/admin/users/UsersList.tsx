import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  DeleteButton,
  CreateButton,
  TopToolbar,
  usePermissions,
  FunctionField,
} from "react-admin";
import {getHighestRoleInfo} from "../../../helpers/RoleMaper";
import RoleChip from "./roleChip";

const UsersListActions = () => (
  <TopToolbar>
    <CreateButton label="Добави потребител" />
  </TopToolbar>
);

export const UsersList = () => {
  return (
    <List actions={<UsersListActions />} title="Потребители">
      <Datagrid>
        <TextField source="username" label="Потребителско име" />
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
