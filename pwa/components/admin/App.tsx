import * as React from "react";
import { HydraAdmin, ResourceGuesser } from "@api-platform/admin";
import { getToken } from "../../jwt-frontend-auth/src/auth/authService";
import authProvider from "./authProvider";
import { EmployeesList } from "./employees/employeesList";
import { EmployeesCreate } from "./employees/employeesCreate";
import { EmployeesShow } from "./employees/employeesShow";
import { Dashboard } from "./Dashboard";
import { UsersList } from "./users/UsersList";
import { UsersCreate } from "./users/UsersCreate";
import { UsersEdit } from "./users/UsersEdit";

const AnyHydraAdmin: any = HydraAdmin;

const App = () => {
  // Pass the JWT token to HydraAdmin via custom fetch
  const token = getToken();
  const fetchHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AnyHydraAdmin
      entrypoint={window.origin}
      title="API Platform Admin"
      fetchHeaders={fetchHeaders}
      authProvider={authProvider}
      dashboard={Dashboard}
    >
      <ResourceGuesser name="employees" list={EmployeesList} create={EmployeesCreate} show={EmployeesShow} />
      <ResourceGuesser name="positions" />
      <ResourceGuesser name="users" list={UsersList} create={UsersCreate} edit={UsersEdit} />
    </AnyHydraAdmin>
  );
};

export default App;