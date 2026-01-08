import { useEffect } from "react";
import { useInput } from "react-admin";
import { TextField } from "@mui/material";

export const AutoIncrementInput = (props: any) => {
  const { label, helperText, sx, isRequired } = props;
  const { field, fieldState, id } = useInput(props);
  
  // Extract ref to pass it to inputRef, as TextField ref is for the root element
  const { ref, ...restField } = field;

  // Try to get index from props or derive from field name (e.g. "columns.0.column_number" or "columns[0].column_number")
  let index = props.index;
  if (typeof index !== 'number' && field.name) {
      const match = field.name.match(/[.\[](\d+)[.\]]/);
      if (match) {
          index = parseInt(match[1], 10);
      }
  }

  const calculatedValue = typeof index === 'number' ? index + 1 : '';

  useEffect(() => {
    if (calculatedValue !== '' && field.value !== calculatedValue) {
      field.onChange(calculatedValue);
    }
  }, [calculatedValue, field.value, field.onChange]);

  return (
    <TextField
      id={id}
      {...restField}
      inputRef={ref}
      value={calculatedValue}
      label={label}
      InputProps={{
        readOnly: true,
      }}
      error={!!fieldState.error}
      helperText={fieldState.error?.message || helperText}
      required={isRequired}
      sx={{ ...sx, '& .MuiInputBase-root': { backgroundColor: 'rgba(0, 0, 0, 0.06)' } }}
      variant="filled"
      margin="dense"
      size="small"
      type="number"
    />
  );
};
