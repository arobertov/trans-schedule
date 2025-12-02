import * as React from "react";
import {
  Edit,
  SimpleForm,
  TextInput,
  PasswordInput,
  required,
  minLength,
  useNotify,
  useRedirect,
  FormDataConsumer,
  useDataProvider,
  Toolbar,
  SaveButton,
} from "react-admin";
import api from "../../../jwt-frontend-auth/src/api/apiClient";

const validateUsername = [required("Потребителското име е задължително"), minLength(3, "Минимум 3 символа")];
const validateOldPassword = (value: any, allValues: any) => {
  // If changing password, old password is required
  if (allValues.plainPassword && !value) {
    return "Моля въведете старата парола";
  }
  return undefined;
};

const validateNewPassword = (value: any) => {
  if (value && value.length < 6) {
    return "Новата парола трябва да е поне 6 символа";
  }
  return undefined;
};

const validateConfirmPassword = (value: any, allValues: any) => {
  if (allValues.plainPassword && value !== allValues.plainPassword) {
    return "Паролите не съвпадат";
  }
  return undefined;
};

export const UsersEdit = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  const dataProvider = useDataProvider();

  const handleSave = async (data: any) => {
    try {
      const payload: any = { username: data.username };
      
      // If changing password, include password fields
      if (data.plainPassword) {
        payload.oldPassword = data.oldPassword;
        payload.plainPassword = data.plainPassword;
      }
      
      // Use apiClient which has proper interceptors
      await api.patch(`${data.id}`, payload);

      notify("Потребителят е актуализиран успешно");
      redirect("/users");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.['hydra:description'] 
        || error?.response?.data?.detail
        || error?.response?.data?.message 
        || error?.message 
        || "Грешка при актуализация";
      notify(errorMessage, { type: 'error' });
    }
  };

  const CustomToolbar = () => (
    <Toolbar>
      <SaveButton alwaysEnable />
    </Toolbar>
  );

  return (
    <Edit title="Редактиране на потребител">
      <SimpleForm onSubmit={handleSave} toolbar={<CustomToolbar />}>
        <TextInput 
          source="username" 
          label="Потребителско име" 
          validate={validateUsername}
          helperText="Минимум 3 символа"
        />
        
        <PasswordInput 
          source="oldPassword" 
          label="Стара парола"
          validate={validateOldPassword}
          helperText="Задължително ако променяте паролата"
        />
        
        <PasswordInput 
          source="plainPassword" 
          label="Нова парола"
          validate={validateNewPassword}
          helperText="Оставете празно за да не променяте паролата (минимум 6 символа)"
        />
        
        <FormDataConsumer>
          {({ formData }) =>
            formData.plainPassword && (
              <PasswordInput
                source="confirmPassword"
                label="Потвърдете новата парола"
                validate={validateConfirmPassword}
                helperText="Въведете новата парола отново"
              />
            )
          }
        </FormDataConsumer>
      </SimpleForm>
    </Edit>
  );
};
