import { Create, SimpleForm, NumberInput, required, Toolbar, SaveButton } from 'react-admin';

const CalendarCreateToolbar = () => (
    <Toolbar>
        <SaveButton 
        alwaysEnable
        label="Създай Календар" 
        />
    </Toolbar>
);

export const CalendarCreate = () => (
    <Create redirect="show" title="Създаване на Календар">
        <SimpleForm toolbar={<CalendarCreateToolbar />}>
            <NumberInput 
                source="year" 
                label="Година" 
                defaultValue={new Date().getFullYear()} 
                validate={[required()]}
            />
        </SimpleForm>
    </Create>
);
