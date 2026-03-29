import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  PasswordInput,
  SelectArrayInput,
  required,
  minLength,
  useNotify,
  useRedirect,
} from "react-admin";
import { ROLES } from "../../../helpers/RoleMaper";

const validateUsername = [required("Потребителското име е задължително"), minLength(3, "Минимум 3 символа")];
const validatePassword = [required("Паролата е задължителна"), minLength(6, "Минимум 6 символа")];
const validateConfirmPassword = (value: any, allValues: any) => {
  if (!value) {
    return "Потвърждението на паролата е задължително";
  }

  if (allValues.plainPassword && value !== allValues.plainPassword) {
    return "Паролите не съвпадат";
  }

  return undefined;
};
const roleChoices = [
  { id: ROLES.SUPER_ADMIN, name: "Супер Администратор" },
  { id: ROLES.ADMIN, name: "Администратор" },
  { id: ROLES.OPERATOR, name: "Оператор" },
  { id: ROLES.CONTROL, name: "Мениджмънт" },
  { id: ROLES.LIMITED, name: "Ограничен" },
  { id: ROLES.USER, name: "Потребител" },
];

export const UsersCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const defaultValues = {
    username: "",
    firstName: "",
    lastName: "",
    plainPassword: "",
    confirmPassword: "",
    roles: [ROLES.USER],
  };

  const onSuccess = () => {
    notify("Потребителят е създаден успешно");
    redirect("/users");
  };

  return (
    <Create mutationOptions={{ onSuccess }} title="Създаване на потребител">
      <SimpleForm defaultValues={defaultValues}>
        <TextInput 
          source="username" 
          label="Потребителско име" 
          validate={validateUsername}
          helperText="Минимум 3 символа"
          autoComplete="new-username"
          fullWidth
        />
        <TextInput
          source="firstName"
          label="Име"
          fullWidth
        />
        <TextInput
          source="lastName"
          label="Фамилия"
          fullWidth
        />
        <PasswordInput 
          source="plainPassword" 
          label="Парола" 
          validate={validatePassword}
          helperText="Минимум 6 символа"
          autoComplete="new-password"
          fullWidth
        />
        <PasswordInput
          source="confirmPassword"
          label="Потвърди паролата"
          validate={validateConfirmPassword}
          helperText="Въведете паролата отново"
          autoComplete="new-password"
          fullWidth
        />
        <SelectArrayInput
          source="roles"
          label="Роли"
          choices={roleChoices}
          optionText="name"
          optionValue="id"
          helperText="Изберете една или повече роли"
          fullWidth
        />

      </SimpleForm>
    </Create>
  );
};
