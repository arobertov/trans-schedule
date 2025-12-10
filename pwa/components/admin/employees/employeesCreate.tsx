import { 
  Create,  
  SimpleForm, 
  TextInput, 
  required, 
  email,
  ReferenceInput,
  AutocompleteInput,
  SelectInput
} from "react-admin";
import { Grid } from '@mui/material';

const validateEmail = [email('Невалиден имейл адрес')];
const validateRequired = [required('Задължително поле')];
const validatePhone = [
  required('Задължително поле'),
  (value: string) => {
    if (value && !/^(?:\+359|0)8[789]\d{7}$/.test(value)) {
      return 'Невалиден телефонен номер (напр. 0888123456 или +359888123456)';
    }
    return undefined;
  }
];

export const EmployeesCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ status: 'активен' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextInput 
            source="first_name" 
            label="Име" 
            validate={validateRequired}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextInput 
            source="middle_name" 
            label="Презиме"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextInput 
            source="last_name" 
            label="Фамилия" 
            validate={validateRequired}
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextInput 
            source="phone" 
            label="Телефон" 
            validate={validatePhone}
            placeholder="0888123456"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput 
            source="email" 
            label="Имейл" 
            validate={validateEmail}
            type="email"
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ReferenceInput 
            source="position" 
            reference="positions"
            sort={{ field: 'name', order: 'ASC' }}
          >
            <AutocompleteInput 
              label="Позиция" 
              optionText="name"
              validate={validateRequired}
              fullWidth
            />
          </ReferenceInput>
        </Grid>
        <Grid item xs={12} md={6}>
          <SelectInput
            source="status"
            label="Статус"
            choices={[
              { id: 'активен', name: 'Активен' },
              { id: 'неактивен', name: 'Неактивен' },
              { id: 'напуснал', name: 'Напуснал' },
            ]}
            validate={validateRequired}
            fullWidth
          />
        </Grid>
      </Grid>

      <TextInput 
        source="notes" 
        label="Бележки" 
        multiline
        rows={4}
        fullWidth
      />
    </SimpleForm>
  </Create>
);