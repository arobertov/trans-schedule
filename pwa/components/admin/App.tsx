import * as React from "react";
import { HydraAdmin, ResourceGuesser, hydraDataProvider, fetchHydra } from "@api-platform/admin";
import { CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { getToken } from "../../jwt-frontend-auth/src/auth/authService";
import authProvider from "./authProvider";
import { EmployeesList } from "./employees/employeesList";
import { EmployeesCreate } from "./employees/employeesCreate";
import { EmployeesShow } from "./employees/employeesShow";
import { EmployeesBulkImport } from "./employees/EmployeesBulkImport";
import { ShiftsList } from "./shifts/shiftsList";
import { ShiftsCreate } from "./shifts/shiftsCreate";
import { ShiftsEdit } from "./shifts/shiftsEdit";
import { ShiftsShow } from "./shifts/shiftsShow";
import { ShiftsBulkImport } from "./shifts/ShiftsBulkImport";
import { Dashboard } from "./Dashboard";
import { UsersList } from "./users/UsersList";
import { UsersCreate } from "./users/UsersCreate";
import { UsersEdit } from "./users/UsersEdit";
import { PositionsList } from "./positions/PositionList";
import { PositionsShow } from "./positions/PositionShow";
import { CustomLayout } from "./CustomLayout";
import i18nProvider from "./i18n";

const AnyHydraAdmin: any = HydraAdmin;

// Wrap fetchHydra to add JWT token
const authenticatedFetchHydra = (url: any, options: any = {}) => {
  const token = getToken();
  console.log('authenticatedFetchHydra called:', url.toString(), 'hasToken:', !!token);
  
  // Проверка дали токенът е изтекъл
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        console.log('Token expired in fetch, redirecting to login');
        window.location.href = '/';
        return Promise.reject(new Error('Token expired'));
      }
    } catch (error) {
      console.error('Error parsing token in fetch:', error);
    }
  }
  
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
      layout={CustomLayout}
      i18nProvider={i18nProvider}
    >
      <ResourceGuesser name="employees" list={EmployeesList} create={EmployeesCreate} show={EmployeesShow} />
      <ResourceGuesser name="positions" list={PositionsList} show={PositionsShow} />
      <ResourceGuesser name="users" list={UsersList} create={UsersCreate} edit={UsersEdit} />
      <ResourceGuesser name="shift_schedules" list={ShiftsList} create={ShiftsCreate} edit={ShiftsEdit} show={ShiftsShow} />
      
      <CustomRoutes>
        <Route path="/employees/bulk-import" element={<EmployeesBulkImport />} />
        <Route path="/shifts/bulk-import" element={<ShiftsBulkImport />} />
      </CustomRoutes>
    </AnyHydraAdmin>
  );
};

export default App;