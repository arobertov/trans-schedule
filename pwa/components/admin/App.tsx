import * as React from "react";
import { HydraAdmin, ResourceGuesser, hydraDataProvider, fetchHydra } from "@api-platform/admin";
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

// Wrap fetchHydra to add JWT token
const authenticatedFetchHydra = (url: any, options: any = {}) => {
  const token = getToken();
  console.log('authenticatedFetchHydra called:', url.toString(), 'hasToken:', !!token);
  
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  return fetchHydra(url, { ...options, headers });
};

const App = () => {
  console.log('App rendering, hasToken:', !!getToken());

  // Create dataProvider with authenticated fetch
  const dataProvider = hydraDataProvider({
    entrypoint: window.origin,
    httpClient: authenticatedFetchHydra,
  });

  return (
    <AnyHydraAdmin
      entrypoint={window.origin}
      title="API Platform Admin"
      dataProvider={dataProvider}
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