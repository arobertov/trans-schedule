import * as React from "react";
import { Menu, useResourceDefinitions } from "react-admin";
import { MenuItemLink, useSidebarState } from "react-admin";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { Collapse, List } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

export const CustomMenu = () => {
  const [employeesOpen, setEmployeesOpen] = React.useState(false);
  const [open] = useSidebarState();
  const resources = useResourceDefinitions();
  const [orderDetailsOpen, setOrderDetailsOpen] = React.useState(false);

  const handleEmployeesClick = () => {
    setEmployeesOpen(!employeesOpen);
  };

  const handleOrderDetailsClick = () => {
    setOrderDetailsOpen(!orderDetailsOpen);
  }

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

      <MenuItemLink
        to="/order_patterns"
        primaryText="Порядъци"
        leftIcon={<ViewWeekIcon />}
        onClick={handleOrderDetailsClick}
        rightIcon={orderDetailsOpen ? <ExpandLess /> : <ExpandMore />}
      />
      <Collapse in={orderDetailsOpen && open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding></List>
         <MenuItemLink
            to="/order_pattern_details"
            primaryText="Детайли на Порядък"
            leftIcon={<ListAltIcon />}
            sx={{ pl: 4 }}
      />
      </Collapse>
    </Menu>
  );
};
