import * as React from "react";
import { AppBar } from "react-admin";
import { CustomUserMenu } from "./CustomUserMenu";

export const CustomAppBar = (props: any) => (
  <AppBar {...props} userMenu={<CustomUserMenu />} />
);
