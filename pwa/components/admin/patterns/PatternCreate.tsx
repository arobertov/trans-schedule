import { 
  Create, 
  SimpleForm, 
  TextInput, 
  NumberInput, 
  BooleanInput,
  ArrayInput,
  SimpleFormIterator
} from "react-admin";

export const PatternCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Наименование" isRequired />
      <NumberInput source="total_positions" label="Брой позиции" isRequired min={2} />
      <BooleanInput source="is_active" label="Активен" defaultValue={false} />
      <TextInput source="description" label="Описание" multiline />

      <ArrayInput source="columns" label="Колони на порядъка">
        <SimpleFormIterator inline>
          <NumberInput 
            source="column_number" 
            label="№" 
            min={1} 
            isRequired 
            sx={{ width: 130 }}
          />
          <TextInput 
            source="column_name" 
            label="Име на колоната" 
            placeholder="Делник" 
            isRequired
            helperText="Например: Делник, Празник_Делник"
          />
          <TextInput 
            source="label" 
            label="Етикет" 
            placeholder="Длн" 
            isRequired
            sx={{ width: 150 }}
            helperText="Кратко обозначение (Длн, П/Д)"
          />
          <TextInput 
            source="description" 
            label="Описание" 
            multiline
          />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);