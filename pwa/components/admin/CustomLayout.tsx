import * as React from "react";
import { Layout } from "react-admin";
import { CustomMenu } from "./CustomMenu";
import { CustomAppBar } from "./CustomAppBar";

export const CustomLayout = (props: any) => (
	<Layout {...props} menu={CustomMenu} appBar={CustomAppBar} />
);
