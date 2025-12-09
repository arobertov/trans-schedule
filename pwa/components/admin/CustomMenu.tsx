import * as React from "react";
import { Menu, useResourceDefinitions } from "react-admin";
import { MenuItemLink, useSidebarState } from "react-admin";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Collapse, List } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

export const CustomMenu = () => {
  const [employeesOpen, setEmployeesOpen] = React.useState(false);
  const [open] = useSidebarState();
  const resources = useResourceDefinitions();

  const handleEmployeesClick = () => {
    setEmployeesOpen(!employeesOpen);
  };

  return (
    <Menu>
      <MenuItemLink
        to="/"
        primaryText="Табло за управление"
        leftIcon={<DashboardIcon />}
      />
      
      <MenuItemLink
        to="/employees"
        primaryText="Служители"
        leftIcon={<PeopleIcon />}
        onClick={handleEmployeesClick}
        rightIcon={employeesOpen ? <ExpandLess /> : <ExpandMore />}
      />
      
      <Collapse in={employeesOpen && open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <MenuItemLink
            to="/positions"
            primaryText="Длъжности"
            leftIcon={<WorkIcon />}
            sx={{ pl: 4 }}
          />
        </List>
      </Collapse>

      <MenuItemLink
        to="/users"
        primaryText="Потребители"
        leftIcon={<PersonIcon />}
      />
      
      <MenuItemLink
        to="/shift_schedules"
        primaryText="График на смени"
        leftIcon={<ScheduleIcon />}
      />
    </Menu>
  );
};
