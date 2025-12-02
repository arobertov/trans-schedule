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
} from "react-admin";

const UsersListActions = () => (
  <TopToolbar>
    <CreateButton label="Добави потребител" />
  </TopToolbar>
);

export const UsersList = () => {
  return (
    <List actions={<UsersListActions />} title="Потребители">
      <Datagrid>
        <TextField source="id" label="ID" />
        <TextField source="username" label="Потребителско име" />
        <EditButton label="Редактирай" />
        <DeleteButton label="Изтрий" />
      </Datagrid>
    </List>
  );
};
