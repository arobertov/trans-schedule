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
import { ShiftSchedulesList } from "./shift_schedules/ShiftSchedulesList";
import { ShiftSchedulesCreate } from "./shift_schedules/ShiftSchedulesCreate";
import { ShiftSchedulesEdit } from "./shift_schedules/ShiftSchedulesEdit";
import { ShiftSchedulesShow } from "./shift_schedules/ShiftSchedulesShow";
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

const parseZeroTimeToMinutes = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "0:00" || trimmed === "-0:00") {
    return 0;
  }

  const match = trimmed.match(/^(-?)(\d+):(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) {
    return undefined;
  }

  return sign * (hours * 60 + minutes);
};

const normalizeTimeToLocalHHmm = (value: unknown): unknown => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return value;
    }

    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const normalizeShiftScheduleDetailsPayload = (data: any) => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const normalized = { ...data };

  delete normalized["@context"];
  delete normalized["@id"];
  delete normalized["@type"];
  delete normalized.id;
  delete normalized.originId;
  delete normalized.created_at;
  delete normalized.updated_at;
  delete normalized.total_time;

  if (normalized.shift_schedule !== undefined && normalized.shift_schedule !== null) {
    if (typeof normalized.shift_schedule === "object") {
      const iri = normalized.shift_schedule["@id"]
        ?? (typeof normalized.shift_schedule.id === "string" ? normalized.shift_schedule.id : null)
        ?? (typeof normalized.shift_schedule.id === "number" ? `/shift_schedules/${normalized.shift_schedule.id}` : null);

      if (iri) {
        normalized.shift_schedule = iri;
      }
    } else if (typeof normalized.shift_schedule === "number") {
      normalized.shift_schedule = `/shift_schedules/${normalized.shift_schedule}`;
    }
  }

  normalized.at_doctor = normalizeTimeToLocalHHmm(normalized.at_doctor);
  normalized.at_duty_officer = normalizeTimeToLocalHHmm(normalized.at_duty_officer);
  normalized.shift_end = normalizeTimeToLocalHHmm(normalized.shift_end);
  normalized.worked_time = normalizeTimeToLocalHHmm(normalized.worked_time);
  normalized.night_work = normalizeTimeToLocalHHmm(normalized.night_work);

  if (Array.isArray(normalized.routes)) {
    normalized.routes = normalized.routes.map((route: any) => {
      if (!route || typeof route !== "object") {
        return route;
      }

      return {
        ...route,
        in_schedule: normalizeTimeToLocalHHmm(route.in_schedule),
        from_schedule: normalizeTimeToLocalHHmm(route.from_schedule),
      };
    });
  }

  const parsedZeroTime = parseZeroTimeToMinutes(normalized.zero_time);

  if (parsedZeroTime !== undefined) {
    normalized.zero_time = parsedZeroTime;
  }

  return normalized;
};

const App = () => {
  console.log('App rendering, hasToken:', !!getToken());

  // Create dataProvider with authenticated fetch
  const baseDataProvider = hydraDataProvider({
    entrypoint: window.origin,
    httpClient: authenticatedFetchHydra,
  });

  const dataProvider = {
    ...baseDataProvider,
    create: (resource: string, params: any) => {
      if (resource !== "shift_schedule_details") {
        return baseDataProvider.create(resource, params);
      }

      return baseDataProvider.create(resource, {
        ...params,
        data: normalizeShiftScheduleDetailsPayload(params.data),
      });
    },
    update: (resource: string, params: any) => {
      if (resource !== "shift_schedule_details") {
        return baseDataProvider.update(resource, params);
      }

      return baseDataProvider.update(resource, {
        ...params,
        data: normalizeShiftScheduleDetailsPayload(params.data),
      });
    },
  };

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
      <ResourceGuesser
        name="shift_schedules"
        list={ShiftSchedulesList}
        create={ShiftSchedulesCreate}
        edit={ShiftSchedulesEdit}
        show={ShiftSchedulesShow}
        recordRepresentation="name"
        options={{ label: "График на смените" }}
      />
      <ResourceGuesser name="shift_schedule_details" list={ShiftsList} create={ShiftsCreate} edit={ShiftsEdit} show={ShiftsShow} />
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