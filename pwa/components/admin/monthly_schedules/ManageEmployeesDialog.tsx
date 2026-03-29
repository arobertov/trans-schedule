import React from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    TextField,
    Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export interface ManageEmployeesDialogProps {
    open: boolean;
    onClose: () => void;
    allEmployees: any[];
    loadedEmployees: any[];
    selectedEmp: any;
    onSelectedEmpChange: (emp: any) => void;
    onAddEmployee: () => void;
    onRemoveEmployee: (empId: number) => void;
}

export const ManageEmployeesDialog: React.FC<ManageEmployeesDialogProps> = ({
    open,
    onClose,
    allEmployees,
    loadedEmployees,
    selectedEmp,
    onSelectedEmpChange,
    onAddEmployee,
    onRemoveEmployee,
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Управление на служители</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1, display: 'flex', gap: 1 }}>
                    <Autocomplete
                        sx={{ flex: 1 }}
                        options={allEmployees}
                        getOptionLabel={(option: any) =>
                            `${option.first_name} ${option.middle_name || ''} ${option.last_name}`
                        }
                        value={selectedEmp}
                        onChange={(_e, v) => onSelectedEmpChange(v)}
                        renderInput={(params) => (
                            <TextField {...params} label="Избери служител за добавяне" />
                        )}
                    />
                    <Button onClick={onAddEmployee} disabled={!selectedEmp} variant="contained">
                        Добави
                    </Button>
                </Box>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Включени в графика ({loadedEmployees.length})
                </Typography>
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                    <List dense>
                        {loadedEmployees.map((emp: any) => (
                            <ListItem key={emp.id} divider>
                                <ListItemText
                                    primary={
                                        emp.fullName ||
                                        [emp.first_name, emp.middle_name, emp.last_name]
                                            .filter(Boolean)
                                            .join(' ')
                                    }
                                    secondary={`ID: ${emp.id}`}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => onRemoveEmployee(emp.id)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Затвори</Button>
            </DialogActions>
        </Dialog>
    );
};
