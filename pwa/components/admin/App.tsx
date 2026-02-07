import * as React from "react";
import { HydraAdmin, ResourceGuesser, hydraDataProvider, fetchHydra } from "@api-platform/admin";
import { CustomRoutes, Resource } from 'react-admin';
import { Route } from 'react-router-dom';
import { getToken } from "../../jwt-frontend-auth/src/auth/authService";
import authProvider from "./authProvider";
import { EmployeesList } from "./employees/employeesList";
import { EmployeesCreate } from "./employees/employeesCreate";
import { EmployeesEdit } from "./employees/EmployeesEdit";
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
import {
  PatternList,
  PatternCreate,
  PatternEdit,
  PatternShow,
  PatternDetailList,
  PatternDetailCreate,
  PatternDetailEdit,
  PatternBulkImport,
} from "./patterns";
import { MatrixList, MatrixCreate, MatrixShow, MatrixEdit } from "./matrices";
import { MonthlyScheduleList, MonthlyScheduleCreate, MonthlyScheduleEdit } from "./monthly_schedules";
import { CalendarList, CalendarCreate, CalendarShow, CalendarEdit } from "./calendars"; 
import { defaultTheme } from 'react-admin';
import { TrainScheduleList } from "./train_schedules/TrainScheduleList";
import { TrainScheduleCreate } from "./train_schedules/TrainScheduleCreate";
import { TrainScheduleEdit } from "./train_schedules/TrainScheduleEdit";
import { TrainScheduleShow } from "./train_schedules/TrainScheduleShow";
import { TrainScheduleLineList } from "./train_schedules/TrainScheduleLineList";
import { TrainDiagramList } from "./train_diagrams/TrainDiagramList";
import { TrainDiagramCreate } from "./train_diagrams/TrainDiagramCreate";
import { TrainDiagramShow } from "./train_diagrams/TrainDiagramShow";

const AnyHydraAdmin: any = HydraAdmin;

const theme = {
    ...defaultTheme,
    typography: {
        fontFamily: '"Sofia Sans", sans-serif',
    },
    components: {
        ...defaultTheme.components,
        MuiTypography: {
            styleOverrides: {
                root: {
                    fontFamily: '"Sofia Sans", sans-serif',
                },
            },
        },
    },
};

// Wrap fetchHydra to add JWT token
const authenticatedFetchHydra = (url: any, options: any = {}) => {
  const token = getToken();
  //console.log('authenticatedFetchHydra called:', url.toString(), 'hasToken:', !!token);

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
      theme={theme}
    >
      <ResourceGuesser name="employees" list={EmployeesList} create={EmployeesCreate} edit={EmployeesEdit} show={EmployeesShow} />
      <ResourceGuesser name="positions" list={PositionsList} show={PositionsShow} />
      <ResourceGuesser name="users" list={UsersList} create={UsersCreate} edit={UsersEdit} />
      <ResourceGuesser name="shift_schedules" list={ShiftsList} create={ShiftsCreate} edit={ShiftsEdit} show={ShiftsShow} />
      <ResourceGuesser name="order_patterns" list={PatternList} create={PatternCreate} edit={PatternEdit} show={PatternShow} />
      <ResourceGuesser name="order_pattern_details" list={PatternDetailList} create={PatternDetailCreate} edit={PatternDetailEdit} />
      <ResourceGuesser name="matrices" list={MatrixList} create={MatrixCreate} show={MatrixShow} edit={MatrixEdit} />
      <ResourceGuesser name="monthly_schedules" list={MonthlyScheduleList} create={MonthlyScheduleCreate} edit={MonthlyScheduleEdit} />
      <ResourceGuesser name="calendars" list={CalendarList} create={CalendarCreate} edit={CalendarEdit} show={CalendarShow} />
      <ResourceGuesser name="train_schedules" list={TrainScheduleList} create={TrainScheduleCreate} edit={TrainScheduleEdit} show={TrainScheduleShow} />
      <ResourceGuesser name="train_schedule_lines" list={TrainScheduleLineList} />
      <ResourceGuesser name="train_diagrams" list={TrainDiagramList} create={TrainDiagramCreate} show={TrainDiagramShow} />

      <CustomRoutes>
        <Route path="/employees/bulk-import" element={<EmployeesBulkImport />} />
        <Route path="/shifts/bulk-import" element={<ShiftsBulkImport />} />
        <Route path="/patterns/bulk-import" element={<PatternBulkImport />} />
      </CustomRoutes>
    </AnyHydraAdmin>
  );
};

export default App;