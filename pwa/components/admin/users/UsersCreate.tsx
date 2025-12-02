import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  PasswordInput,
  required,
  minLength,
  useNotify,
  useRedirect,
} from "react-admin";

const validateUsername = [required("Потребителското име е задължително"), minLength(3, "Минимум 3 символа")];
const validatePassword = [required("Паролата е задължителна"), minLength(6, "Минимум 6 символа")];

export const UsersCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const onSuccess = () => {
    notify("Потребителят е създаден успешно");
    redirect("/users");
  };

  return (
    <Create mutationOptions={{ onSuccess }} title="Създаване на потребител">
      <SimpleForm>
        <TextInput 
          source="username" 
          label="Потребителско име" 
          validate={validateUsername}
          helperText="Минимум 3 символа"
          fullWidth
        />
        <PasswordInput 
          source="plainPassword" 
          label="Парола" 
          validate={validatePassword}
          helperText="Минимум 6 символа"
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
};
