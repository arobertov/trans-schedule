import * as React from "react";
import { Logout, UserMenu, useGetIdentity, usePermissions, useRedirect, useUserMenu } from "react-admin";
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { hasMinimumRole, ROLES } from '../../helpers/RoleMaper';

const ProfileMenuItem = () => {
  const { onClose } = useUserMenu();
  const redirect = useRedirect();

  const handleClick = () => {
    onClose();
    redirect('/profile');
  };

  return (
    <MenuItem onClick={handleClick}>
      <ListItemIcon>
        <AccountCircleIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Моят профил</ListItemText>
    </MenuItem>
  );
};

export const CustomUserMenu = (props: any) => {
  const { permissions } = usePermissions();
  const { data: identity } = useGetIdentity();
  const isAdminOrSuperAdmin = hasMinimumRole(permissions, ROLES.ADMIN);
  const profileName =
    typeof identity?.fullName === 'string' && identity.fullName.trim() !== ''
      ? identity.fullName
      : 'Профил';

  return (
    <UserMenu {...props} label={profileName}>
      <MenuItem disabled>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{profileName}</ListItemText>
      </MenuItem>
      {!isAdminOrSuperAdmin && <ProfileMenuItem />}
      <Logout />
    </UserMenu>
  );
};
